// server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const Video = require("./models/Video");
const Series = require("./models/Series");

const app = express();
app.use(cors());
app.use(express.json());

// =====================
// Conexão MongoDB
// =====================
const MONGO_URI = process.env.MONGODB_URI;
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Conectado ao MongoDB Atlas"))
  .catch((err) => console.error("❌ Erro ao conectar MongoDB:", err));

// =====================
// Rotas de Saúde
// =====================
app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// =====================
// Rotas de Vídeos
// =====================
app.get("/api/videos", async (req, res) => {
  const items = await Video.find().sort({ createdAt: -1 });
  res.json(items);
});

app.post("/api/videos/by-url", async (req, res) => {
  try {
    const { title, category, url, thumbnail } = req.body || {};
    if (!title || !url) {
      return res.status(400).json({ message: "title e url são obrigatórios" });
    }
    const video = await Video.create({
      title,
      category,
      url,
      thumbnail: thumbnail || "https://placehold.co/400x225",
    });
    res.status(201).json(video);
  } catch (err) {
    console.error("Erro ao salvar vídeo:", err);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

app.delete("/api/videos/:id", async (req, res) => {
  try {
    await Video.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "Erro ao excluir vídeo" });
  }
});

// =====================
// Rotas de Séries
// =====================
app.get("/api/series", async (req, res) => {
  const items = await Series.find().sort({ createdAt: -1 });
  res.json(items);
});

app.post("/api/series/by-url", async (req, res) => {
  try {
    const { title, seasonNumber, seriesThumbnail, episodes } = req.body || {};
    if (!title || !episodes || !episodes.length) {
      return res
        .status(400)
        .json({ message: "title e episodes são obrigatórios" });
    }

    const serie = await Series.create({
      title,
      thumbnail: seriesThumbnail || "https://placehold.co/400x225",
      seasons: [
        {
          seasonNumber: Number(seasonNumber) || 1,
          episodes,
        },
      ],
    });

    res.status(201).json(serie);
  } catch (err) {
    console.error("Erro ao salvar série:", err);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

app.put("/api/series/:id/add-episodes", async (req, res) => {
  try {
    const { id } = req.params;
    const { seasonNumber, episodes } = req.body || {};
    if (!episodes || !episodes.length) {
      return res.status(400).json({ message: "episodes é obrigatório" });
    }

    const serie = await Series.findById(id);
    if (!serie) return res.status(404).json({ message: "Série não encontrada" });

    // procura temporada
    let season = serie.seasons.find(
      (s) => s.seasonNumber === Number(seasonNumber)
    );
    if (!season) {
      season = { seasonNumber: Number(seasonNumber), episodes: [] };
      serie.seasons.push(season);
    }

    // calcula próxima numeração
    let nextNum = season.episodes.length + 1;
    const newEpisodes = episodes.map((ep) => ({
      episodeNumber: nextNum++,
      title: ep.title,
      url: ep.url,
      thumbnail: ep.thumbnail || "https://placehold.co/400x225",
    }));

    season.episodes.push(...newEpisodes);
    await serie.save();

    res.json(serie);
  } catch (err) {
    console.error("Erro ao adicionar episódios:", err);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

app.delete("/api/series/:id", async (req, res) => {
  try {
    await Series.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "Erro ao excluir série" });
  }
});

// =====================
// Inicialização
// =====================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`🚀 DudyFlix backend rodando na porta ${PORT}`)
);
