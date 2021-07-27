CREATE TABLE category
(
  id character varying(100) NOT NULL,
  data json[],
  PRIMARY KEY (id)
);

CREATE TABLE channel
(
  id character varying(100) NOT NULL,
  country character varying(25),
  customurl character varying(250),
  description character varying,
  favorites character varying,
  highthumbnail character varying,
  likes character varying,
  localizeddescription character varying,
  localizedtitle character varying(100),
  mediumthumbnail character varying,
  publishedat date,
  thumbnail character varying,
  title character varying(250),
  uploads character varying(100),
  count character varying,
  itemcount character varying,
  playlistcount integer,
  playlistitemcount integer,
  playlistvideocount integer,
  playlistvideoitemcount integer,
  lastupload timestamp without time zone,
  PRIMARY KEY (id)
);

CREATE TABLE channel_sync
(
  id character varying(100) NOT NULL,
  synctime timestamp without time zone,
  uploads character varying(100),
  PRIMARY KEY (id)
);

CREATE TABLE playlist
(
  id character varying(100) NOT NULL,
  channelid character varying(100),
  channeltitle character varying(250),
  description character varying,
  highthumbnail character varying,
  count integer,
  localizeddescription character varying,
  localizedtitle character varying,
  maxresthumbnail character varying,
  mediumthumbnail character varying,
  publishedat date,
  standardthumbnail character varying,
  thumbnail character varying,
  title character varying(200),
  itemcount double precision,
  PRIMARY KEY (id)
);

CREATE TABLE playlist_video
(
  id character varying(100) NOT NULL,
  videos character varying[],
  PRIMARY KEY (id)
);

CREATE TABLE video
(
  id character varying(100) NOT NULL,
  caption character varying(255),
  categoryid character varying(20),
  channelid character varying(100),
  channeltitle character varying(255),
  defaultaudiolanguage character varying(255),
  defaultlanguage character varying(255),
  description character varying,
  dimension character varying(20),
  highthumbnail character varying(255),
  licensedcontent boolean,
  livebroadcastcontent character varying(255),
  localizeddescription character varying,
  localizedtitle character varying(255),
  maxresthumbnail character varying(255),
  mediumthumbnail character varying(255),
  projection character varying(255),
  publishedat timestamp without time zone,
  standardthumbnail character varying(255),
  tags character varying[],
  thumbnail character varying(255),
  title character varying(255),
  allowedregions character varying(100)[],
  blockedregions character varying(100)[],
  definition double precision,
  duration double precision,
  PRIMARY KEY (id)
)



