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
      return res.status(400).json({ message: "title e episodes são obrigatórios" });
    }

    const cover = seriesThumbnail || "https://placehold.co/400x225";

    // Garante que todos os episódios usem a capa da série se não tiverem thumbnail
    const episodesWithThumb = episodes.map((ep) => ({
      ...ep,
      thumbnail: ep.thumbnail || cover,
    }));

    const serie = await Series.create({
      title,
      thumbnail: cover,
      seasons: [
        {
          seasonNumber: Number(seasonNumber) || 1,
          episodes: episodesWithThumb,
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

    // Usa automaticamente o thumbnail da série como fallback para cada episódio
    const coverThumb = serie.thumbnail || "https://placehold.co/400x225";

    let season = serie.seasons.find((s) => s.seasonNumber === Number(seasonNumber));
    if (!season) {
      season = { seasonNumber: Number(seasonNumber), episodes: [] };
      serie.seasons.push(season);
    }

    let nextNum = season.episodes.length + 1;
    const newEpisodes = episodes.map((ep) => ({
      episodeNumber: nextNum++,
      title: ep.title,
      url: ep.url,
      thumbnail: ep.thumbnail || coverThumb,
    }));

    season.episodes.push(...newEpisodes);
    serie.markModified("seasons");
    await serie.save();
    res.json(serie);
  } catch (err) {
    console.error("Erro ao adicionar episódios:", err);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

app.delete("/api/series/:id/seasons/:seasonNumber/episodes/:episodeNumber", async (req, res) => {
  try {
    const { id, seasonNumber, episodeNumber } = req.params;
    const serie = await Series.findById(id);
    if (!serie) return res.status(404).json({ message: "Série não encontrada" });

    const season = serie.seasons.find((s) => s.seasonNumber === Number(seasonNumber));
    if (!season) return res.status(404).json({ message: "Temporada não encontrada" });

    season.episodes = season.episodes.filter((ep) => ep.episodeNumber !== Number(episodeNumber));

    // Renumera os episódios restantes
    season.episodes = season.episodes.map((ep, idx) => ({ ...ep, episodeNumber: idx + 1 }));

    serie.markModified("seasons");
    await serie.save();
    res.json(serie);
  } catch (err) {
    console.error("Erro ao excluir episódio:", err);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

app.put("/api/series/:id/seasons/:seasonNumber/reorder", async (req, res) => {
  try {
    const { id } = req.params;
    const seasonNum = Number(req.params.seasonNumber);
    const { episodes } = req.body || {};

    if (!Array.isArray(episodes) || !episodes.length) {
      return res.status(400).json({ message: "episodes é obrigatório" });
    }

    const serie = await Series.findById(id);
    if (!serie) return res.status(404).json({ message: "Série não encontrada" });

    const season = serie.seasons.find((s) => s.seasonNumber === seasonNum);
    if (!season) return res.status(404).json({ message: "Temporada não encontrada" });

    const coverThumb = serie.thumbnail || "https://placehold.co/400x225";

    season.episodes = episodes.map((ep, idx) => ({
      episodeNumber: idx + 1,
      title: ep.title,
      url: ep.url,
      thumbnail: ep.thumbnail || coverThumb,
    }));

    serie.markModified("seasons");
    await serie.save();
    res.json(serie);
  } catch (err) {
    console.error("Erro ao reordenar episódios:", err);
    res.status(500).json({ message: "Erro interno", error: err.message });
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


// ── PATCH /api/videos/:id/thumbnail ──────────────────────────────
app.patch("/api/videos/:id/thumbnail", async (req, res) => {
  try {
    const { thumbnail } = req.body || {};
    if (!thumbnail) return res.status(400).json({ message: "thumbnail é obrigatório" });
    const video = await Video.findByIdAndUpdate(
      req.params.id,
      { thumbnail },
      { new: true }
    );
    if (!video) return res.status(404).json({ message: "Vídeo não encontrado" });
    res.json(video);
  } catch (err) {
    res.status(500).json({ message: "Erro interno", error: err.message });
  }
});

// ── PATCH /api/series/:id/thumbnail ──────────────────────────────
app.patch("/api/series/:id/thumbnail", async (req, res) => {
  try {
    const { thumbnail } = req.body || {};
    if (!thumbnail) return res.status(400).json({ message: "thumbnail é obrigatório" });
    const serie = await Series.findByIdAndUpdate(
      req.params.id,
      { thumbnail },
      { new: true }
    );
    if (!serie) return res.status(404).json({ message: "Série não encontrada" });
    res.json(serie);
  } catch (err) {
    res.status(500).json({ message: "Erro interno", error: err.message });
  }
});

// =====================
// Inicialização
// =====================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`🚀 DudyFlix backend rodando na porta ${PORT}`)
);
