import {Pool, PoolClient} from 'pg';
import { VideoCategory } from 'video-service';

export interface StringMap {
  [key: string]: string;
}
export interface Statement {
  query: string;
  args?: any[];
}
export interface CategoryCollection {
  id: string;
  data: VideoCategory[];
}

export interface Manager {
  exec(sql: string, args?: any[]): Promise<number>;
  query<T>(sql: string, args?: any[], m?: StringMap, fields?: string): Promise<T[]>;
  queryOne<T>(sql: string, args?: any[], m?: StringMap, fields?: string): Promise<T>;
  executeScalar<T>(sql: string, args?: any[]): Promise<T>;
  count(sql: string, args?: any[]): Promise<number>;
}
export class PoolManager implements Manager {
  constructor(public pool: Pool) {
    this.exec = this.exec.bind(this);
    this.execute = this.execute.bind(this);
    this.query = this.query.bind(this);
    this.queryOne = this.queryOne.bind(this);
    this.executeScalar = this.executeScalar.bind(this);
    this.count = this.count.bind(this);
  }
  exec(sql: string, args?: any[]): Promise<number> {
    return exec(this.pool, sql, args);
  }
  execute(statements: Statement[]): Promise<number>{
    return execute(this.pool, statements);
  }
  query<T>(sql: string, args?: any[], m?: StringMap, fields?: string): Promise<T[]> {
    return query(this.pool, sql, args, m, fields);
  }
  queryOne<T>(sql: string, args?: any[], m?: StringMap, fields?: string): Promise<T> {
    return queryOne(this.pool, sql, args, m, fields);
  }
  executeScalar<T>(sql: string, args?: any[]): Promise<T> {
    return executeScalar<T>(this.pool, sql, args);
  }
  count(sql: string, args?: any[]): Promise<number> {
    return count(this.pool, sql, args);
  }
}
export class PoolClientManager implements Manager {
  constructor(public client: PoolClient) {
    this.exec = this.exec.bind(this);
    this.execute = this.execute.bind(this);
    this.query = this.query.bind(this);
    this.queryOne = this.queryOne.bind(this);
    this.executeScalar = this.executeScalar.bind(this);
    this.count = this.count.bind(this);
  }
  exec(sql: string, args?: any[]): Promise<number> {
    return execWithClient(this.client, sql, args);
  }
  execute(statements: Statement[]): Promise<number>{
    return executeWithClient(this.client, statements);
  }
  query<T>(sql: string, args?: any[], m?: StringMap, fields?: string): Promise<T[]> {
    return queryWithClient(this.client, sql, args, m, fields);
  }
  queryOne<T>(sql: string, args?: any[], m?: StringMap, fields?: string): Promise<T> {
    return queryOneWithClient(this.client, sql, args, m, fields);
  }
  executeScalar<T>(sql: string, args?: any[]): Promise<T> {
    return executeScalarWithclient<T>(this.client, sql, args);
  }
  count(sql: string, args?: any[]): Promise<number> {
    return countWithclient(this.client, sql, args);
  }
}
export async function executeWithClient(client: PoolClient, statements: Statement[]) : Promise<number>{
  try {
    await client.query('BEGIN')
    const arrPromise =  statements.map((item) => 
      client.query(item.query,item.args?item.args:[])
    )
    let count = 0;
    await Promise.all(arrPromise).then(results =>{
        for (const obj of results){
          count += obj.rowCount;
        }
      });
    await client.query('COMMIT')
    return count;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } 
}
export async function execute(pool: Pool, statements: Statement[]) : Promise<number>{
  try {
    await pool.query('BEGIN')
    const arrPromise =  statements.map((item) => 
      pool.query(item.query,item.args?item.args:[])
    )
    let count = 0;
    await Promise.all(arrPromise).then(results =>{
        for (const obj of results){
          count += obj.rowCount;
        }
      });
    await pool.query('COMMIT')
    return count;
  } catch (e) {
    await pool.query('ROLLBACK');
    throw e;
  } 
}
export function exec(pool: Pool, sql: string, args?: any[]): Promise<number> {
  const p = (args ? args : []);
  return new Promise<number>((resolve, reject) => {
    return pool.query(sql, p,  (err, results) => {
      if (err) {
        return reject(err);
      } else {
        return resolve(results.rowCount);
      }
    });
  });
}
export function query<T>(pool: Pool, sql: string, args?: any[], m?: StringMap, fields?: string): Promise<T[]> {
  const p = (args ? args : []);
  return new Promise<T[]>((resolve, reject) => {
    return pool.query<T>(sql, p,  (err, results) => {
      if (err) {
        return reject(err);
      } else {
        return resolve(handleResults(results.rows, m, fields));
      }
    });
  });
}
export function queryOne<T>(pool: Pool, sql: string, args?: any[], m?: StringMap, fields?: string): Promise<T> {
  return query<T>(pool, sql, args, m, fields).then(r => {
    return (r && r.length > 0 ? r[0] : null);
  });
}
export function executeScalar<T>(pool: Pool, sql: string, args?: any[]): Promise<T> {
  return queryOne<T>(pool, sql, args).then(r => {
    if (!r) {
      return null;
    } else {
      const keys = Object.keys(r);
      return r[keys[0]];
    }
  });
}
export function count(pool: Pool, sql: string, args?: any[]): Promise<number> {
  return executeScalar<number>(pool, sql, args);
}
export function execWithClient(client: PoolClient, sql: string, args?: any[]): Promise<number> {
  const p = (args ? args : []);
  return new Promise<number>((resolve, reject) => {
    return client.query(sql, p,  (err, results) => {
      if (err) {
        return reject(err);
      } else {
        return resolve(results.rowCount);
      }
    });
  });
}
export function queryWithClient<T>(client: PoolClient, sql: string, args?: any[], m?: StringMap, fields?: string): Promise<T[]> {
  const p = (args ? args : []);
  return new Promise<T[]>((resolve, reject) => {
    return client.query<T>(sql, p,  (err, results) => {
      if (err) {
        return reject(err);
      } else {
        return resolve(handleResults(results.rows, m, fields));
      }
    });
  });
}
export function queryOneWithClient<T>(client: PoolClient, sql: string, args?: any[], m?: StringMap, fields?: string): Promise<T> {
  return queryWithClient<T>(client, sql, args, m, fields).then(r => {
    return (r && r.length > 0 ? r[0] : null);
  });
}
export function executeScalarWithclient<T>(client: PoolClient, sql: string, args?: any[]): Promise<T> {
  return queryOneWithClient<T>(client, sql, args).then(r => {
    if (!r) {
      return null;
    } else {
      const keys = Object.keys(r);
      return r[keys[0]];
    }
  });
}
export function countWithclient(client: PoolClient, sql: string, args?: any[]): Promise<number> {
  return executeScalarWithclient<number>(client, sql, args);
}
export function handleResults<T>(r: T[], m?: StringMap, fields?: string) {
  if (m) {
    const res = mapArray(r, m);
    if (fields && fields.length > 0) {
      return handleBool(res, fields);
    } else {
      return res;
    }
  } else {
    if (fields && fields.length > 0) {
      return handleBool(r, fields);
    } else {
      return r;
    }
  }
}
export function handleBool<T>(objs: T[], fields: string) {
  if (!fields || fields.length === 0 || !objs) {
    return objs;
  }
  for (const obj of objs) {
    for (const field of fields) {
      const value = obj[field];
      if (value != null && value !== undefined) {
        // tslint:disable-next-line:triple-equals
        obj[field] = ('1' == value || 'T' === value || 'Y' === value);
      }
    }
  }
  return objs;
}
export function map<T>(obj: T, m?: StringMap): any {
  if (!m) {
    return obj;
  }
  const mkeys = Object.keys(m);
  if (mkeys.length === 0) {
    return obj;
  }
  const obj2: any = {};
  const keys = Object.keys(obj);
  for (const key of keys) {
    let k0 = m[key];
    if (!k0) {
      k0 = key;
    }
    obj2[k0] = obj[key];
  }
  return obj2;
}
export function mapArray<T>(results: T[], m?: StringMap): T[] {
  if (!m) {
    return results;
  }
  const mkeys = Object.keys(m);
  if (mkeys.length === 0) {
    return results;
  }
  const objs = [];
  const length = results.length;
  for (let i = 0; i < length; i++) {
    const obj = results[i];
    const obj2: any = {};
    const keys = Object.keys(obj);
    for (const key of keys) {
      let k0 = m[key];
      if (!k0) {
        k0 = key;
      }
      obj2[k0] = (obj as any)[key];
    }
    objs.push(obj2);
  }
  return objs;
}
export function buildQueryUpsert(tableName:string, listFields:string[]): string{
  let listValues = listFields.map((item, index) => `$${index + 1}`);
  let queryUpdate = listFields.map((item, index) => `${item} = $${index + 1}`);
  return `INSERT INTO ${tableName}(${listFields.join()})VALUES (${listValues.join()}) ON CONFLICT (id) DO UPDATE SET ${queryUpdate.slice(1,queryUpdate.length).join()}`
}