export interface StringMap {
  [key: string]: string;
}
export interface ListResult<T> {
  list?: T[];
  total?: number;
  limit?: number;
  nextPageToken?: string;
}
export type ChannelSortType = 'title' | 'count' | 'date';
export interface ChannelSM {
  q?: string;
  sort?: SortType; // date, rating, relevance, title, count (for channels)
  forMine?: boolean;
  channelId?: string;
  channelType?: string; // any, show
  publishedAfter?: Date;
  publishedBefore?: Date;
  regionCode?: string;
  relevanceLanguage?: string;
  safeSearch?: string; // moderate, none, strict
  topicId?: string;
}
export type PlaylistSortType = 'title' | 'count' | 'date';
export interface PlaylistSM {
  q?: string;
  sort?: SortType; // date, rating, relevance, title, count (for channels), viewCount (for live broadcast)
  forMine?: boolean;
  channelId?: string;
  channelType?: string; // any, show
  publishedAfter?: Date;
  publishedBefore?: Date;
  regionCode?: string;
  relevanceLanguage?: string;
  safeSearch?: string; // moderate, none, strict
}
export type ChannelType = 'show' | 'any' | '';
export type EventType = 'completed' | 'live' | 'upcoming' | '';
export type ItemType = 'video' | 'channel' | 'playlist' | 'any' | '';
export type Duration = 'long' | 'medium' | 'short' | 'any' | '';
export type Caption = 'closedCaption' | 'none' | 'any' | '';
export type Definition = 'high' | 'standard' | 'any' | '';
export type Dimension = '2d' | '3d' | 'any' | '';
export type EmbeddableType = 'true' | 'any' | '';
export type LicenseType = 'creativeCommon' | 'youtube' | 'any' | '';
export type SyndicatedType = 'true' | 'any' | '';
export type VideoType = 'movie' | 'episode' | 'any' | '';
export type SortType = 'rating' | 'date' | 'count' | 'relevance' | 'title' | 'viewCount' | '';
export interface ItemSM {
  q?: string;
  type?: ItemType; // video, channel, playlist
  duration?: Duration; // any, long (more than 20 minutes), medium (from 4 minutes to 20 minutes), short (less than 4 minutes)
  sort?: SortType; // date, rating, relevance, title, videoCount (for channels), viewCount (for live broadcast) => title, date => publishedAt, relevance => rank, count => videoCount
  relatedToVideoId?: string;
  forMine?: boolean;
  channelId?: string;
  channelType?: ChannelType; // any, show
  eventType?: EventType; // completed, live, upcoming
  publishedAfter?: Date;
  publishedBefore?: Date;
  regionCode?: string;
  relevanceLanguage?: string;
  safeSearch?: string; // moderate, none, strict
  topicId?: string;
  categoryId?: string;
  caption?: Caption; // any, closedCaption, none
  definition?: Definition; // any, high, standard
  dimension?: Dimension; // 2d, 3d, any
  embeddable?: EmbeddableType; // any, true
  license?: LicenseType; // any, creativeCommon, youtube
  syndicated?: SyndicatedType; // any, true
  videoType?: SyndicatedType; // any, episode, movie
}
export interface Item extends Title, Thumbnail, ChannelInfo {
  kind?: string; // video, channel, playlist
  id?: string;
  liveBroadcastContent?: string; // upcoming, live, none
  publishTime: Date;
}
export interface ItemInfo extends Title, Thumbnail, ChannelInfo, LocalizedTitle {
  kind?: string;
  id?: string;
}
export interface VideoCategory {
  id: string;
  title: string;
  assignable?: boolean;
  channelId?: string;
}
export interface Channel extends ItemInfo {
  customUrl?: string;
  country?: string;
  likes?: string;
  favorites?: string;
  uploads?: string;
  lastUpload?: Date;
  count?: number;
  itemCount?: number;
  playlistCount?: number;
  playlistItemCount?: number;
  playlistVideoCount?: number;
  playlistVideoItemCount?: number;
}
export interface Playlist extends ItemInfo, BigThumbnail {
  count?: number;
  itemCount?: number;
}
export interface PlaylistItemInfo {
  playlistId?: string;
  position?: number;
  videoOwnerChannelId?: string;
  videoOwnerChannelTitle?: string;
}
export interface PlaylistVideo extends ItemInfo, BigThumbnail, PlaylistItemInfo {
  duration?: number;
  dimension?: string;
  definition?: number; // 0: 144, 1: 240, 2: 360, 3: 480, 4: 720, 5: 1080, 6: 1440, 7: 2160
  caption?: boolean;
  licensedContent?: boolean;
  projection?: string;
}
export interface VideoInfo {
  tags?: string[];
  categoryId?: string;
  liveBroadcastContent?: string;
  defaultLanguage?: string;
  defaultAudioLanguage?: string;
}
export interface Video extends ItemInfo, BigThumbnail, VideoDetail, VideoInfo {
  videoOwnerChannelId?: string;
  videoOwnerChannelTitle?: string;
  blockedRegions?: string[];
  allowedRegions?: string[];
}
export interface VideoDetail {
  duration: number;
  dimension: string;
  definition: number; // 0: 144, 1: 240, 2: 360, 3: 480, 4: 720, 5: 1080, 6: 1440, 7: 2160
  caption: boolean;
  licensedContent: boolean;
  projection: string;
}
export interface Thumbnail {
  thumbnail?: string;
  mediumThumbnail?: string;
  highThumbnail?: string;
}
export interface BigThumbnail {
  standardThumbnail?: string;
  maxresThumbnail?: string;
}
export interface ThumbnailInfo {
  url: string;
  width: number;
  height: number;
}
export interface Thumbnails {
  default: ThumbnailInfo;
  medium: ThumbnailInfo;
  high: ThumbnailInfo;
  standard?: ThumbnailInfo;
  maxres?: ThumbnailInfo;
}
export interface Title {
  title?: string;
  description?: string;
  publishedAt?: Date;
}
export interface LocalizedTitle {
  localizedTitle?: string;
  localizedDescription?: string;
}
export interface ChannelInfo {
  channelId?: string;
  channelTitle?: string;
}
export interface ListDetail {
  itemCount: number;
}
export interface PageInfo {
  totalResults: number;
  resultsPerPage: number;
}
export interface ChannelDetail {
  relatedPlaylists: RelatedPlaylists;
}
export interface RelatedPlaylists {
  likes?: string;
  favorites?: string;
  uploads?: string;
}
export interface VideoItemDetail {
  videoId: string;
  videoPublishedAt: Date;
}
export interface RegionRestriction {
  allow?: string[];
  blocked?: string[];
}
export interface YoutubeVideoDetail {
  duration: string;
  dimension: string;
  definition: string;
  caption: string;
  licensedContent: boolean;
  projection: string;
  regionRestriction?: RegionRestriction;
}
export interface BaseSnippet extends Title, ChannelInfo {
  thumbnails: Thumbnails;
  localized: Title;
}
export interface SearchSnippet extends Title, ChannelInfo {
  thumbnails: Thumbnails;
  liveBroadcastContent?: string;
  publishTime?: Date;
}
export interface SearchId {
  kind?: string;
  videoId?: string;
  channelId?: string;
  playlistId?: string;
}
export interface PlaylistSnippet extends BaseSnippet {
  itemCount: number;
}
export interface ChannelSnippet extends Title, BaseSnippet {
  customUrl?: string;
  country?: string;
}
export interface YoutubeKind {
  kind: string;
}
export interface ResourceId extends YoutubeKind {
  videoId: string;
}
export interface PlaylistVideoSnippet extends PlaylistItemInfo, BaseSnippet {
  resourceId: ResourceId;
}
export interface VideoSnippet extends BaseSnippet, VideoInfo {
}
export interface YoutubeListResult<T> extends YoutubeKind {
  etag: string;
  items: T[];
  pageInfo: PageInfo;
  nextPageToken?: string;
}
export interface ListItem<ID, T, D> extends YoutubeKind {
  id: ID;
  etag?: string;
  snippet?: T;
  contentDetails?: D;
}
export interface CategorySnippet {
  title: string;
  assignable: boolean;
  channelId: string;
}
