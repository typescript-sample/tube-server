export interface TopLevelCommentSnippet {
  videoId: string;
  topLevelComment: TopLevelComment;
  canReply: boolean;
  totalReplyCount: number;
  isPublic: boolean;
}
export interface TopLevelComment {
  kind: string;
  etag: string;
  id: string;
  snippet: TopLevelCommentSubSnippet;
}
export interface TopLevelCommentSubSnippet extends CommentInfo, YoutubeAuthor {
  videoId: string;
}

export interface CommentThead extends Author, CommentInfo {
  videoId: string;
  canReply: boolean;
  totalReplyCount: number;
  isPublic: boolean;
  nextPageToken?: string;
}

export interface Comment extends Author, CommentInfo {
  parentId: string;
}
export interface AuthorChannelId {
  value: string;
}
export interface AuthorInfo {
  authorDisplayName: string;
  authorChannelUrl: string;
  authorProfileImageUrl: string;
}
export interface Author extends AuthorInfo {
  authorChannelId: string;
}
export interface YoutubeAuthor extends AuthorInfo {
  authorChannelId: AuthorChannelId;
}
export interface CommentInfo {
  id: string;
  textDisplay: string;
  textOriginal: string;
  canRate: boolean;
  viewerRating: string;
  likeCount: number;
  publishedAt: Date;
  updatedAt: Date;
}
export interface CommentSnippet extends CommentInfo, YoutubeAuthor {
  parentId: string;
}
