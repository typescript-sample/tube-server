import {CategorySnippet, Channel, ChannelDetail, ChannelSnippet, Item, ListDetail, ListItem, ListResult, Playlist, PlaylistSnippet, PlaylistVideo, PlaylistVideoSnippet, SearchId, SearchSnippet, StringMap, Video, VideoCategory, VideoItemDetail, VideoSnippet, YoutubeListResult, YoutubeVideoDetail} from './models';
export * from './models';
export * from './comment';

export function calculateDuration(d: string): number {
  if (!d) {
    return 0;
  }
  const k = d.split('M');
  if (k.length < 2) {
    return 0;
  }
  const a = k[1].substr(0, k[1].length - 1);
  const x = k[0].split('H');
  const b = (x.length === 1 ? k[0].substr(2) : x[1]);
  if (!isNaN(a as any) && !isNaN(b as any)) {
    const a1 = parseFloat(a);
    const a2 = parseFloat(b);
    if (x.length === 1) {
      return a2 * 60 + a1;
    } else {
      const c = x[0].substr(2);
      if (!isNaN(c as any)) {
        const a3 = parseFloat(c);
        return a3 * 3600 + a2 * 60 + a1;
      } else {
        return 0;
      }
    }
  }
  return 0;
}
// date, rating, relevance, title, videoCount (for channels), viewCount (for live broadcast) => title, date => publishedAt, relevance => rank, count => videoCount
export const youtubeSortMap: StringMap = {
  publishedAt: 'date',
  rank: 'rating',
  count: 'videoCount'
};
export function getYoutubeSort(s: string): string {
  if (!s || s.length === 0) {
    return undefined;
  }
  const s2 = youtubeSortMap[s];
  if (s2) {
    return s2;
  }
  if (s === 'date' || s === 'rating' || s === 'title' || s === 'videoCount' || s === 'viewCount') { // s === 'relevance'
    return s;
  }
  return undefined;
}
export function fromYoutubeCategories(res: YoutubeListResult<ListItem<string, CategorySnippet, any>>): VideoCategory[] {
  return res.items.filter(i => i.snippet).map(item => {
    const snippet = item.snippet;
    const i: VideoCategory = {
      id: item.id,
      title: snippet.title,
      assignable: snippet.assignable,
      channelId: snippet.channelId
    };
    return i;
  });
}
export function fromYoutubeChannels(res: YoutubeListResult<ListItem<string, ChannelSnippet, ChannelDetail>>): Channel[] {
  return res.items.filter(i => i.snippet).map(item => {
    const snippet = item.snippet;
    const thumbnail = snippet.thumbnails;
    const i: Channel = {
      id: item.id,
      title: snippet.title,
      description: snippet.description,
      publishedAt: new Date(snippet.publishedAt),
      customUrl: snippet.customUrl,
      country: snippet.country,
      localizedTitle: snippet.localized ? snippet.localized.title : '',
      localizedDescription: snippet.localized ? snippet.localized.description : ''
    };
    if (thumbnail) {
      i.thumbnail = thumbnail.default ? thumbnail.default.url : undefined;
      i.mediumThumbnail = thumbnail.medium ? thumbnail.medium.url : undefined;
      i.highThumbnail = thumbnail.high ? thumbnail.high.url : undefined;
    }
    if (item.contentDetails && item.contentDetails.relatedPlaylists) {
      const r = item.contentDetails.relatedPlaylists;
      i.likes = r.likes;
      i.favorites = r.favorites;
      i.uploads = r.uploads;
    }
    return i;
  });
}

export function fromYoutubePlaylists(res: YoutubeListResult<ListItem<string, PlaylistSnippet, ListDetail>>): ListResult<Playlist> {
  const list = res.items.filter(i => i.snippet).map(item => {
    const snippet = item.snippet;
    const thumbnail = snippet.thumbnails;
    const i: Playlist = {
      id: item.id,
      title: snippet.title,
      localizedTitle: snippet.localized ? snippet.localized.title : '',
      localizedDescription: snippet.localized ? snippet.localized.description : '',
      description: snippet.description,
      publishedAt: new Date(snippet.publishedAt),
      channelId: snippet.channelId,
      channelTitle: snippet.channelTitle,
      count: item.contentDetails ? item.contentDetails.itemCount : 0
    };
    if (thumbnail) {
      i.thumbnail = thumbnail.default ? thumbnail.default.url : undefined;
      i.mediumThumbnail = thumbnail.medium ? thumbnail.medium.url : undefined;
      i.highThumbnail = thumbnail.high ? thumbnail.high.url : undefined;
      i.standardThumbnail = thumbnail.standard ? thumbnail.standard.url : undefined;
      i.maxresThumbnail = thumbnail.maxres ? thumbnail.maxres.url : undefined;
    }
    return i;
  });
  return { list, total: res.pageInfo.totalResults, limit: res.pageInfo.resultsPerPage, nextPageToken: res.nextPageToken };
}
export function fromYoutubePlaylist(res: YoutubeListResult<ListItem<string, PlaylistVideoSnippet, VideoItemDetail>>): ListResult<PlaylistVideo> {
  const list = res.items.filter(i => i.snippet).map(item => {
    const snippet = item.snippet;
    const thumbnail = snippet.thumbnails;
    const content = item.contentDetails;
    const i: PlaylistVideo = {
      title: snippet.title ? snippet.title : '',
      description: snippet.description ? snippet.description : '',
      localizedTitle: snippet.localized ? snippet.localized.title : '',
      localizedDescription: snippet.localized ? snippet.localized.description : '',
      channelId: snippet.channelId ? snippet.channelId : '',
      channelTitle: snippet.channelTitle ? snippet.channelTitle : '',
      id: content ? content.videoId : '',
      publishedAt: content ? new Date(content.videoPublishedAt) : undefined,
      playlistId: snippet.playlistId ? snippet.playlistId : '',
      position: snippet.position ? snippet.position : 0,
      videoOwnerChannelId: snippet.videoOwnerChannelId ? snippet.videoOwnerChannelId : '',
      videoOwnerChannelTitle: snippet.videoOwnerChannelTitle ? snippet.videoOwnerChannelTitle : ''
    };
    if (thumbnail) {
      i.thumbnail = thumbnail.default ? thumbnail.default.url : undefined;
      i.mediumThumbnail = thumbnail.medium ? thumbnail.medium.url : undefined;
      i.highThumbnail = thumbnail.high ? thumbnail.high.url : undefined;
      i.standardThumbnail = thumbnail.standard ? thumbnail.standard.url : undefined;
      i.maxresThumbnail = thumbnail.maxres ? thumbnail.maxres.url : undefined;
    }
    return i;
  });
  return { list, total: res.pageInfo.totalResults, limit: res.pageInfo.resultsPerPage, nextPageToken: res.nextPageToken };
}
export function fromYoutubeSearch(res: YoutubeListResult<ListItem<SearchId, SearchSnippet, any>>): ListResult<Item> {
  const list = res.items.filter(i => i.snippet).map(item => {
    const snippet = item.snippet;
    const thumbnail = snippet.thumbnails;
    const i: Item = {
      title: snippet.title ? snippet.title : '',
      description: snippet.description ? snippet.description : '',
      publishedAt: new Date(snippet.publishedAt),
      channelId: snippet.channelId ? snippet.channelId : '',
      channelTitle: snippet.channelTitle ? snippet.channelTitle : '',
      liveBroadcastContent: snippet.liveBroadcastContent,
      publishTime: new Date(snippet.publishTime),
    };
    if (thumbnail) {
      i.thumbnail = thumbnail.default ? thumbnail.default.url : undefined;
      i.mediumThumbnail = thumbnail.medium ? thumbnail.medium.url : undefined;
      i.highThumbnail = thumbnail.high ? thumbnail.high.url : undefined;
    }
    const id = item.id;
    if (id) {
      if (id.videoId) {
        i.id = id.videoId;
        i.kind = 'video';
      } else if (id.channelId) {
        i.id = id.channelId;
        i.kind = 'channel';
      } else if (id.playlistId) {
        i.id = id.playlistId;
        i.kind = 'playlist';
      }
    }
    return i;
  });
  return { list, total: res.pageInfo.totalResults, limit: res.pageInfo.resultsPerPage, nextPageToken: res.nextPageToken };
}
export function fromYoutubeVideos(res: YoutubeListResult<ListItem<string, VideoSnippet, YoutubeVideoDetail>>): ListResult<Video> {
  const list = res.items.map(item => {
    const snippet = item.snippet;
    const content = item.contentDetails;
    if (snippet) {
      const thumbnail = snippet.thumbnails;
      const i: Video = {
        id: item.id,
        title: snippet.title,
        publishedAt: new Date(snippet.publishedAt),
        description: snippet.description,
        localizedTitle: snippet.localized ? snippet.localized.title : '',
        localizedDescription: snippet.localized ? snippet.localized.description : '',
        channelId: snippet.channelId,
        channelTitle: snippet.channelTitle,
        tags: snippet.tags,
        categoryId: snippet.categoryId,
        liveBroadcastContent: snippet.liveBroadcastContent,
        defaultLanguage: snippet.defaultLanguage,
        defaultAudioLanguage: snippet.defaultAudioLanguage,
        duration: calculateDuration(content.duration),
        dimension: content.dimension,
        definition: content.definition === 'hd' ? 5 : 4,
        caption: content.caption === 'true' ? true : undefined,
        licensedContent: content.licensedContent,
        projection: content.projection === 'rectangular' ? undefined : '3'
      };
      if (thumbnail) {
        i.thumbnail = thumbnail.default ? thumbnail.default.url : undefined;
        i.mediumThumbnail = thumbnail.medium ? thumbnail.medium.url : undefined;
        i.highThumbnail = thumbnail.high ? thumbnail.high.url : undefined;
        i.standardThumbnail = thumbnail.standard ? thumbnail.standard.url : undefined;
        i.maxresThumbnail = thumbnail.maxres ? thumbnail.maxres.url : undefined;
      }
      if (content.regionRestriction) {
        i.allowedRegions = content.regionRestriction.allow;
        i.blockedRegions = content.regionRestriction.blocked;
      }
      return i;
    } else {
      const i: Video = {
        id: item.id,
        duration: calculateDuration(content.duration),
        dimension: content.dimension,
        definition: content.definition === 'hd' ? 5 : undefined,
        caption: content.caption === 'true' ? true : undefined,
        licensedContent: content.licensedContent,
        projection: content.projection === 'rectangular' ? undefined : '3'
      };
      if (content.regionRestriction) {
        i.allowedRegions = content.regionRestriction.allow;
        i.blockedRegions = content.regionRestriction.blocked;
      }
      return i;
    }
  });
  return { list, total: res.pageInfo.totalResults, limit: res.pageInfo.resultsPerPage, nextPageToken: res.nextPageToken };
}
