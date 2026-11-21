import * as fs from 'fs';
import * as path from 'path';
export type GaiaConfig = Record<string, string | number | boolean>;
export function loadConfig(): GaiaConfig {
  const file=path.resolve(__dirname,'../../../config/deployment-targets/production.json');
  const raw=JSON.parse(fs.readFileSync(file,'utf8')) as GaiaConfig;
  const result: GaiaConfig={};
  for(const [key,value] of Object.entries(raw)){
    if(typeof value==='string'){
      const match=/^\$\{([A-Z][A-Z0-9_]*)\}$/.exec(value);
      if(match){const actual=process.env[match[1]]?.trim();if(!actual)throw new Error(`Missing deployment variable ${match[1]}`);result[key]=actual;continue;}
    }
    result[key]=value;
  }
  return result;
}
export function str(cfg:GaiaConfig,key:string):string {const v=cfg[key];if(typeof v!=='string'||!v)throw new Error(`Invalid config ${key}`);return v;}
