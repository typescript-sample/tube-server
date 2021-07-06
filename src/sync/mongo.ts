import {BulkWriteOpResultObject, Collection, FilterQuery, FindAndModifyWriteOpResultObject} from 'mongodb';

export interface StringMap {
  [key: string]: string;
}

export function findOne<T>(collection: Collection, query: FilterQuery<T>, idName?: string, m?: StringMap): Promise<T> {
  return _findOne<T>(collection, query).then(obj => mapOne(obj, idName, m));
}
function _findOne<T>(collection: Collection, query: FilterQuery<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    collection.findOne(query, (err, item: T) => err ? reject(err) : resolve(item));
  });
}
export async function insert<T>(collection: Collection, obj: T, idName?: string, handleDuplicate?: boolean): Promise<number> {
  try {
    const value = await collection.insertOne(revertOne(obj, idName));
    mapOne(obj, idName);
    return value.insertedCount;
  } catch (err) {
    if (handleDuplicate && err && err.errmsg) {
      if (err.errmsg.indexOf('duplicate key error collection:') >= 0) {
        if (err.errmsg.indexOf('dup key: { _id:') >= 0) {
          return 0;
        } else {
          return -1;
        }
      }
    }
    throw err;
  }
}
export function update<T>(collection: Collection, obj: T, idName?: string): Promise<number> {
  return new Promise<number>(((resolve, reject) => {
    revertOne(obj, idName);
    if (!(obj as any)['_id']) {
      return reject(new Error('Cannot updateOne an Object that do not have _id field.'));
    }
    collection.findOneAndReplace({ _id: (obj as any)['_id'] }, (obj as any), { returnOriginal: false }, (err, result: FindAndModifyWriteOpResultObject<T>) => {
      if (err) {
        reject(err);
      } else {
        mapOne(obj, idName);
        resolve(result.ok);
      }
    });
  }));
}
export function upsert<T>(collection: Collection, object: T, idName?: string): Promise<number> {
  const obj: any = revertOne(object, idName);
  if (obj['_id']) {
    return new Promise<number>(((resolve, reject) => {
      collection.findOneAndUpdate({ _id: obj['_id'] }, { $set: obj }, {
        upsert: true,
        returnOriginal: false,
      }, (err, result: FindAndModifyWriteOpResultObject<T>) => {
        if (err) {
          reject(err);
        } else {
          if (idName) {
            mapOne(obj, idName);
          }
          resolve(result.ok);
        }
      });
    }));
  } else {
    return insert(collection, object);
  }
}
export function upsertMany<T>(collection: Collection, objects: T[], idName?: string): Promise<number> {
  return new Promise<number>(((resolve, reject) => {
    const operations = [];
    revertArray(objects, idName);
    for (const object of objects) {
      if ((object as any)['_id']) {
        operations.push({
          updateOne: {
            filter: { _id: (object as any)['_id'] },
            update: { $set: object },
            upsert: true,
          },
        });
      } else {
        operations.push({
          insertOne: {
            document: object,
          },
        });
      }
    }
    collection.bulkWrite(operations, (err, result: BulkWriteOpResultObject) => {
      if (err) {
        return reject(err);
      }
      return resolve(result.insertedCount + result.modifiedCount + result.upsertedCount);
    });
  }));
}
export function revertOne(obj: any, idName?: string): any {
  if (idName && idName.length > 0) {
    obj['_id'] = obj[idName];
    delete obj[idName];
  }
  return obj;
}
export function revertArray<T>(objs: T[], idName?: string): T[] {
  if (!objs || !idName) {
    return objs;
  }
  if (idName && idName.length > 0) {
    const length = objs.length;
    for (let i = 0; i < length; i++) {
      const obj: any = objs[i];
      obj['_id'] = obj[idName];
      delete obj[idName];
    }
  }
  return objs;
}
export function mapOne(obj: any, idName?: string, m?: StringMap): any {
  if (!obj || !idName) {
    return obj;
  }
  if (idName && idName.length > 0) {
    obj[idName] = obj['_id'];
    delete obj['_id'];
  }
  if (m) {
    return _mapOne(obj, m);
  } else {
    return obj;
  }
}
export function _mapOne<T>(obj: T, m: StringMap): any {
  const obj2: any = {};
  const keys = Object.keys(obj);
  for (const key of keys) {
    let k0 = m[key];
    if (!k0) {
      k0 = key;
    }
    obj2[k0] = (obj as any)[key];
  }
  return obj2;
}
