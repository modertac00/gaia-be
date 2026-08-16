import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { Pool } from 'pg'
import { DATABASE_POOL } from '../database/database.tokens'
import type { CreateResearchRequestDto } from './dto/create-research-request.dto'

const INIT_DATA_KEY = 'research-library'
const DETAIL_KEYS = [
  'approvalNotice',
  'documentBody',
  'documentDetail',
  'documentDetails',
  'sourceVerification',
] as const

type InitDataRow = {
  payload: unknown
}

type JsonRecord = Record<string, unknown>
type ResearchDocument = {
  meta: string
  status: {
    label: string
    variant: string
  }
  testId: string
  title: string
  topic: string
}

@Injectable()
export class InitService {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async getInitData() {
    const initData = await this.getRawInitData()
    const limitedInitData = { ...initData }

    for (const key of DETAIL_KEYS) {
      delete limitedInitData[key]
    }

    return limitedInitData
  }

  async getResearchDocumentDetail(documentTestId: string) {
    const initData = await this.getRawInitData()
    const document = this.findResearchDocument(initData, documentTestId)

    if (!document) {
      throw new NotFoundException('Research document was not found')
    }

    const documentDetails = this.asRecord(initData.documentDetails)
    const explicitDetail = this.asRecord(documentDetails?.[documentTestId])

    if (explicitDetail) {
      return explicitDetail
    }

    return {
      approvalNotice: initData.approvalNotice,
      documentBody: initData.documentBody,
      documentDetail: {
        ...this.asRecord(initData.documentDetail),
        description: document.detail
          ? `${document.meta} · ${document.detail}`
          : document.meta,
        status: document.status,
        title: document.title,
        topic: document.topic,
      },
      sourceVerification: initData.sourceVerification,
    }
  }

  async createResearchRequest(request: CreateResearchRequestDto) {
    const initData = await this.getRawInitData()
    const researchPanel = this.asRecord(initData.researchPanel)
    const sections = Array.isArray(researchPanel?.sections)
      ? researchPanel.sections
      : []
    const targetSection = sections
      .map((section) => this.asRecord(section))
      .find((section) => section?.testId === 'rs-04-research-section')

    if (!researchPanel || !targetSection) {
      throw new NotFoundException('Research panel is not available')
    }

    const documentTestId = this.createDocumentTestId()
    const document: ResearchDocument = {
      meta: 'Requested just now by RA',
      status: {
        label: 'Queued',
        variant: 'queued',
      },
      testId: documentTestId,
      title: this.normalizeText(request.topic) || 'Untitled research request',
      topic: this.formatResearchType(request.researchType),
    }

    const documents = Array.isArray(targetSection.documents)
      ? targetSection.documents
      : []
    const updatedDocuments = [document, ...documents]

    targetSection.documents = updatedDocuments
    targetSection.documentSummary = this.formatDocumentSummary(updatedDocuments.length)
    targetSection.isExpanded = true

    researchPanel.documentsLabel = this.formatDocumentSummary(
      sections
        .map((section) => this.asRecord(section))
        .reduce((total, section) => {
          const sectionDocuments = Array.isArray(section?.documents)
            ? section.documents
            : []

          return total + sectionDocuments.length
        }, 0),
    )
    initData.activeDocumentTestId = documentTestId

    const documentDetails = this.asRecord(initData.documentDetails) ?? {}
    const instructionMarkdown = this.createResearchInstructionMarkdown(request)

    documentDetails[documentTestId] = this.createRequestedDocumentDetail(
      request,
      document,
      instructionMarkdown,
    )
    initData.documentDetails = documentDetails

    await this.pool.query(
      `
        update app_init_data
        set payload = $2
        where key = $1
      `,
      [INIT_DATA_KEY, initData],
    )

    return {
      activeDocumentTestId: documentTestId,
    }
  }

  private async getRawInitData() {
    const result = await this.pool.query<InitDataRow>(
      `
        select payload
        from app_init_data
        where key = $1
        limit 1
      `,
      [INIT_DATA_KEY],
    )

    const initData = result.rows[0]?.payload

    if (!initData) {
      throw new NotFoundException('Init data has not been seeded')
    }

    const initDataRecord = this.asRecord(initData)

    if (!initDataRecord) {
      throw new NotFoundException('Init data payload is invalid')
    }

    return initDataRecord
  }

  private findResearchDocument(initData: JsonRecord, documentTestId: string) {
    const researchPanel = this.asRecord(initData.researchPanel)
    const sections = Array.isArray(researchPanel?.sections)
      ? researchPanel.sections
      : []

    for (const section of sections) {
      const sectionRecord = this.asRecord(section)
      const documents = Array.isArray(sectionRecord?.documents)
        ? sectionRecord.documents
        : []

      for (const document of documents) {
        const documentRecord = this.asRecord(document)

        if (documentRecord?.testId === documentTestId) {
          return documentRecord
        }
      }
    }

    return null
  }

  private asRecord(value: unknown): JsonRecord | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null
    }

    return value as JsonRecord
  }

  private createDocumentTestId() {
    return `d-${Date.now()}-research-document`
  }

  private createRequestedDocumentDetail(
    request: CreateResearchRequestDto,
    document: ResearchDocument,
    instructionMarkdown: string,
  ) {
    return {
      approvalNotice: {
        message: 'Gaia has queued this request and will draft it before RA review',
        testId: 'gaia-06-approval-notice',
        title: 'Requested — queued for Gaia',
      },
      documentBody: {
        openQuestions: {
          footer: 'Recorded request input · saved for traceability',
          modeLabel: 'Request input',
          questions: this.splitGuidingQuestions(request.guidingQuestions),
          testId: 'gaia-11-open-questions-editor',
          title: 'Guiding questions',
          toolbar: {
            auditLabel: 'Request is audit-logged',
            testId: 'gaia-17-editing-toolbar',
          },
        },
        sections: [
          {
            paragraphs: [[{ text: this.normalizeText(request.scopeNotes) }]],
            testId: 'gaia-08-summary-section',
            title: 'Scope notes',
          },
          {
            markdown: instructionMarkdown,
            testId: 'gaia-18-ai-instruction-markdown',
            title: 'AI instruction markdown',
          },
        ],
      },
      documentDetail: {
        description: `${document.meta} · ${this.formatResearchType(
          request.researchType,
        )} request`,
        status: document.status,
        testId: 'gaia-07-research-document-header',
        title: document.title,
        topic: document.topic,
      },
      sourceVerification: {
        sources: [],
        statusLabel: 'Queued for source discovery',
        testId: 'gaia-12-source-verification-panel',
        title: 'Sources — pending Gaia draft',
      },
      researchInstructionsMarkdown: instructionMarkdown,
    }
  }

  private createResearchInstructionMarkdown(request: CreateResearchRequestDto) {
    const topic = this.normalizeText(request.topic) || 'Untitled research request'
    const researchType = this.formatResearchType(request.researchType)
    const scopeNotes =
      this.normalizeText(request.scopeNotes) || 'No scope notes provided.'
    const aiInstructions =
      this.normalizeText(request.aiInstructions ?? '') ||
      'Use the task prompts below and keep source-backed evidence traceable.'
    const questions = this.splitGuidingQuestions(request.guidingQuestions)
      .map((question) => `- ${question}`)
      .join('\n')

    return [
      '# Research Request',
      '',
      '## Request',
      `- Topic: ${topic}`,
      `- Research type: ${researchType}`,
      '- Requested by: RA',
      '- Status: Queued for Gaia',
      '',
      '## Scope',
      scopeNotes,
      '',
      '## Guiding Questions',
      questions,
      '',
      '## AI Instructions',
      aiInstructions,
      '',
      '## Reusable Task Prompts',
      '',
      '### Find Related Papers',
      'Find recent and authoritative papers relevant to the topic and guiding questions. Prioritize peer-reviewed journals, working papers from credible institutions, and systematic reviews. Return title, authors, year, venue, link or DOI, relevance reason, and any limitation.',
      '',
      '### Scan Regulations',
      'Scan official regulatory and standards sources relevant to the topic. Prioritize primary sources such as government, regulator, standards body, and official EU or national pages. Return jurisdiction, authority, publication date, obligation, effective date, source link, and confidence.',
      '',
      '### Competitor Scan',
      'Identify competitors or comparable products related to the request. Compare positioning, features, pricing signals, target users, proof points, and gaps. Separate factual source-backed claims from inference.',
      '',
      '### Customer Problem Scan',
      'Identify user pains, workflow breakdowns, buying triggers, and objections. Use interview notes, support signals, public reviews, market reports, and credible community discussions when available. Return source-backed insights and product implications.',
      '',
      '### Market Scan',
      'Summarize market size signals, adoption drivers, buyer segments, budget owners, growth catalysts, and risks. Label estimates clearly and preserve source links.',
      '',
      '### Summarize Sources',
      'Summarize each source into claims Gaia can reuse. Include key finding, evidence, source URL, date accessed, confidence, and whether the source needs RA verification.',
      '',
      '### Draft Research Note',
      'Create a structured note with Summary, Key findings, Risks & opportunities, Open questions, and Sources. Every factual claim must keep a source reference.',
      '',
      '## Output Rules',
      '- Prefer primary sources when available.',
      '- Keep source links with every factual claim.',
      '- Mark assumptions and inferences explicitly.',
      '- Do not present unverified claims as approved facts.',
      '- Preserve enough detail for RA review and later Atlas handoff.',
    ].join('\n')
  }

  private formatDocumentSummary(count: number) {
    return `${count} ${count === 1 ? 'document' : 'documents'}`
  }

  private formatResearchType(researchType: string) {
    const labels: Record<string, string> = {
      competitor: 'Competitor',
      'customer-problem': 'Customer problem',
      market: 'Market',
      regulation: 'Regulation',
    }

    return labels[researchType] ?? 'Research'
  }

  private normalizeText(value: string) {
    return value.trim().replace(/\s+/g, ' ')
  }

  private splitGuidingQuestions(value: string) {
    const questions = value
      .split('\n')
      .map((question) => this.normalizeText(question))
      .filter(Boolean)

    return questions.length ? questions : ['What should Gaia investigate first?']
  }
}
