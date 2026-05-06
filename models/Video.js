const mongoose = require("mongoose");

const VideoSchema = new mongoose.Schema(
  {
    title: String,
    category: { type: String, default: "filmes" },
    url: String,
    thumbnail: { type: String, default: "https://placehold.co/400x225" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Video", VideoSchema);
