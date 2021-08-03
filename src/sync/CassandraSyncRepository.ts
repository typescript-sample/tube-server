import { Client, QueryOptions, types } from "cassandra-driver";
import { Channel, ChannelSync, Playlist, PlaylistCollection, SyncRepository, Video } from 'video-service';

export interface QueriesBatch {
  query:string,
  params:any,
}

export class CassandraVideoRepository implements SyncRepository {
  private readonly client: Client;
  private readonly channelsTable: string;
  private readonly videosTable: string;
  private readonly channelSyncTable: string;
  private readonly playlistsTable: string;
  private readonly playlistVideoTable: string;
  constructor(db: Client,channelTable:string,channelSyncTable:string,playlistTable:string,playlistVideoTable:string,videoTable:string) {
    this.client = db;
    this.channelsTable = channelTable;
    this.videosTable = videoTable;
    this.channelSyncTable = channelSyncTable;
    this.playlistsTable = playlistTable;
    this.playlistVideoTable = playlistVideoTable;
  }
  getChannelSync(channelId: string): Promise<ChannelSync> {
    const query = `select * from ${this.channelSyncTable} where id = ?`
    return this.client.execute(query,[channelId],{ prepare: true }).then(result => {
      return result.rows[0]
    }).catch(err=> {
      return err
    })
  }
  saveChannel(channel: Channel): Promise<number> {
    const keys = Object.keys(channel);
    const params = Object.values(channel);
    const queryQuestion = [];
    keys.forEach(()=>{
      queryQuestion.push("?")
    })
    const queries = {
      query:`INSERT INTO ${this.channelsTable} (${keys.join()}) VALUES (${queryQuestion.join()})`,
      params
    }
    return this.client.batch([queries],{ prepare: true }).then(result => {
      return result.rows
    }).catch(err=> {
      console.log(err);
      return err
    })
  }
  saveChannelSync(channel: ChannelSync): Promise<number> {
    const keys = Object.keys(channel);
    const params = Object.values(channel);
    const queryQuestion = [];
    keys.forEach(()=>{
      queryQuestion.push("?")
    })
    const queries = {
      query:`INSERT INTO ${this.channelSyncTable} (${keys.join()}) VALUES (${queryQuestion.join()})`,
      params
    }
    return this.client.batch([queries],{ prepare: true }).then(result => {
      return result.rows
    }).catch(err=> {
      console.log(err);
      return err
    })
  }
  async savePlaylist(playlist: Playlist): Promise<number> {
    const keys = Object.keys(playlist);
    const params = Object.values(playlist)
    const queryQuestion = [];
    keys.forEach(()=>{
      queryQuestion.push("?")
    })
    const queries = {
      query:`INSERT INTO ${this.playlistsTable} (${keys.join()}) VALUES (${queryQuestion.join()})`,
      params
    }
    return this.client.batch([queries],{ prepare: true }).then(result => {
      return result.rows[0]
    }).catch(err=> {
      return err
    })
  }
  async savePlaylists(playlists: Playlist[]): Promise<number> {
    const queries = playlists.map(item =>{
      let queryQuestion = [];
      const params = Object.values(item);
      const keys = Object.keys(item);
      keys.forEach(() => {
        queryQuestion.push("?");
      });
      return  {
        query:`INSERT INTO ${this.playlistsTable} (${keys.join()}) VALUES (${queryQuestion.join()})`,
        params
      }
    })
    const result = await batchToLarge<Playlist[]>(this.client,queries,15,5,undefined);
    return result ? result.length : 0;
  }
  async saveVideos(videos: Video[]): Promise<number> {
    const queries = videos.map(item =>{
      let queryQuestion = [];
      const params = Object.values(item);
      const keys = Object.keys(item);
      keys.forEach(() => {
        queryQuestion.push("?");
      });
      return  {
        query:`INSERT INTO ${this.videosTable} (${keys.join()}) VALUES (${queryQuestion.join()})`,
        params
      }
    })
    const result = await batchToLarge<Video[]>(this.client,queries,5,5,undefined);
    return result ? result.length : 0;
  }
  async savePlaylistVideos(id: string, videos: string[]): Promise<number> {
    const playlistVideo: PlaylistCollection = {
      id,
      videos,
    };
    const keys = Object.keys(playlistVideo);
    const params = Object.values(playlistVideo)
    const queryQuestion = [];
    keys.forEach(()=>{
      queryQuestion.push("?")
    })
    const queries = {
      query:`INSERT INTO ${this.playlistVideoTable} (${keys.join()}) VALUES (${queryQuestion.join()})`,
      params
    }
    return this.client.batch([queries],{ prepare: true }).then(result => {
      return result.rows[0]
    }).catch(err=> {
      return err
    })
  }
  async getVideoIds(ids: string[]): Promise<string[]> {
    const queryQuestion = [];
    ids.forEach(()=>{
      queryQuestion.push("?")
    })
    const query = `SELECT id FROM ${this.videosTable} WHERE id in (${queryQuestion.join()})`
    const result = this.client.execute(query,ids,{ prepare: true }).then(result => {
     return result.rows
    }).catch((err)=> {
      console.log(err);
      return err;
    })
    return result;
  }
}

export function batch<T> (client:Client,queries:QueriesBatch[],option:QueryOptions) : Promise<T> {
  return client.batch( queries, option ? option : { prepare: true }).then((result) =>{
    return result.rows;
  }).catch((err) => {
    console.log('batch',err);
    return err;
  })
}

export async function batchToLarge<T> (client:Client,queries:QueriesBatch[] ,range:number , bactchItems :number, option: QueryOptions ) :  Promise<T>{
  if(queries.length > range ){
    const arrayPromise = [];
    while(queries.length !== 0){
      if(queries.length > bactchItems) {
        arrayPromise.push(client.batch(queries.splice(0,bactchItems), option ? option : { prepare: true })) ;
      }else{
        arrayPromise.push(client.batch(queries.splice(0,queries.length),  option ? option : { prepare: true })) ;
      }
    }
    return await handlePromiseAll<T>(arrayPromise);
  }else{
    return client.batch( queries, option ? option : { prepare: true }).then((result) =>{
      return result.rows;
    }).catch((err) => {
      console.log('batch',err);
      return err;
    })
  }
}

export function handlePromiseAll<T> (arrayPromise:Promise<types.ResultSet>[]) : Promise<T> {
  return Promise.all(arrayPromise).then((result) =>{
    let arrRealResult = [];
    result.forEach(item =>{
      if(item.rows){  
        arrRealResult = [... arrRealResult,...item.rows];
      }
    })
    return arrRealResult
  }).catch((err) => {
    console.log(err);
    return err;
  })
}

export function buildFields<T>(fields: string[], all?: string[]): string {
  const s = getFields(fields,all);
  if(!s || s.length === 0){
    return '*';
  }else{
    return s.join();
  }
}

export function getFields<T>(fields: string[], all?: string[]): string[] {
  if (!fields || fields.length === 0) {
    return undefined;
  }
  const existFields : string [] = []; 
  if (all) {
    for (const s of fields) {
      if (all.includes(s)) {
        existFields.push(s);
      }
    }
    if(existFields.length === 0){
      return all;
    }else{
      return existFields;
    }

  } 
  else {
    return fields;
  }
}