create table category
(
  id character varying(100) not null,
  data json[],
  primary key (id)
);

create table channel
(
  id character varying(100) not null,
  country character varying(25),
  customurl character varying(250),
  publishedat timestamp with time zone,
  title character varying(255),
  description character varying,
  localizedtitle character varying(255),
  localizeddescription character varying,
  thumbnail character varying(255),
  mediumthumbnail character varying(255),
  highthumbnail character varying(255),
  uploads character varying(100),
  favorites character varying,
  likes character varying,
  lastupload timestamp with time zone,
  count integer,
  itemcount integer,
  playlistcount integer,
  playlistitemcount integer,
  playlistvideocount integer,
  playlistvideoitemcount integer,
  channels character varying[],
  primary key (id)
);

create table channelsync
(
  id character varying(100) not null,
  synctime timestamp with time zone,
  uploads character varying(100),
  primary key (id)
);

create table playlist
(
  id character varying(100) not null,
  channelid character varying(100),
  channeltitle character varying(255),
  publishedat timestamp with time zone,
  title character varying(255),
  description character varying,
  localizedtitle character varying(255),
  localizeddescription character varying,
  thumbnail character varying(255),
  mediumthumbnail character varying(255),
  highthumbnail character varying(255),
  standardthumbnail character varying(255),
  maxresthumbnail character varying(255),
  count integer,
  itemcount integer,
  primary key (id)
);

create table playlistvideo
(
  id character varying(100) not null,
  videos character varying[],
  primary key (id)
);

create table video
(
  id character varying(100) not null,
  categoryid character varying(20),
  channelid character varying(100),
  channeltitle character varying(255),
  publishedat timestamp with time zone,
  title character varying(255),
  description character varying,
  localizedtitle character varying(255),
  localizeddescription character varying,
  thumbnail character varying(255),
  mediumthumbnail character varying(255),
  highthumbnail character varying(255),
  standardthumbnail character varying(255),
  maxresthumbnail character varying(255),
  tags character varying[],
  rank smallint,
  caption character varying(255),
  duration bigint,
  definition smallint,
  dimension character varying(20),
  projection character varying(255),
  defaultlanguage character varying(255),
  defaultaudiolanguage character varying(255),
  allowedregions character varying(100)[],
  blockedregions character varying(100)[],
  licensedcontent boolean,
  livebroadcastcontent character varying(255),
  primary key (id)
)
