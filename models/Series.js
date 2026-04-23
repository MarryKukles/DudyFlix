const mongoose = require("mongoose");

const EpisodeSchema = new mongoose.Schema(
  {
    episodeNumber: Number,
    title: String,
    url: String,
    thumbnail: { type: String, default: "https://placehold.co/400x225" },
  },
  { _id: false }
);

const SeasonSchema = new mongoose.Schema(
  {
    seasonNumber: Number,
    episodes: [EpisodeSchema],
  },
  { _id: false }
);

const SeriesSchema = new mongoose.Schema(
  {
    title: String,
    thumbnail: { type: String, default: "https://placehold.co/400x225" },
    seasons: [SeasonSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Series", SeriesSchema);
