import {Db} from 'mongodb';
import {Model} from './metadata';
import {deleteById, insert, patch, update, upsert} from './mongo';
import {MongoLoader} from './MongoLoader';

export function getCollectionName(model: Model, collectionName?: string) {
  const n: string = (collectionName ? collectionName : (model.collection ? model.collection : (model.source ? model.source : model.name)));
  return n;
}

export class MongoWriter<T, ID> extends MongoLoader<T, ID> {
  constructor(db: Db, model: Model) {
    super(db.collection(getCollectionName(model)), model);
    this.insert = this.insert.bind(this);
    this.update = this.update.bind(this);
    this.patch = this.patch.bind(this);
    this.save = this.save.bind(this);
    this.delete = this.delete.bind(this);
  }
  insert(obj: T): Promise<number> {
    return insert(this.collection, obj, this.idName, true);
  }
  update(obj: T): Promise<number> {
    return update(this.collection, obj, this.idName);
  }
  patch(obj: T): Promise<number> {
    return patch(this.collection, obj, this.idName);
  }
  save(obj: T): Promise<number> {
    return upsert(this.collection, obj, this.idName);
  }
  delete(id: ID): Promise<number> {
    return deleteById(this.collection, id);
  }
}
