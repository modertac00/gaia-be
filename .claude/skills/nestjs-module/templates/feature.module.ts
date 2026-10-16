import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { __Feature__Controller } from './__feature__.controller'
import { __Feature__Service } from './__feature__.service'
import { __Feature__Model } from './models/__feature__.model'
import { __FEATURE___REPOSITORY } from './repositories/__feature__.repository'
import { Sequelize__Feature__Repository } from './repositories/sequelize-__feature__.repository'

@Module({
  imports: [SequelizeModule.forFeature([__Feature__Model])],
  controllers: [__Feature__Controller],
  providers: [__Feature__Service, { provide: __FEATURE___REPOSITORY, useClass: Sequelize__Feature__Repository }],
  exports: [__Feature__Service], // remove if no other module consumes it
})
export class __Feature__Module {}
