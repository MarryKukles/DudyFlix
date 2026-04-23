const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();

app.use(cors());
app.use(express.json());

// =====================
// FIREBASE INIT
// =====================
const serviceAccount = require('./firebaseKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// =====================
// VIDEOS
// =====================

// GET vídeos
app.get('/api/videos', async (req, res) => {
  const snapshot = await db.collection('videos').get();

  const videos = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  res.json(videos);
});

// POST vídeo
app.post('/api/videos/by-url', async (req, res) => {
  const doc = await db.collection('videos').add(req.body);

  res.json({
    id: doc.id,
    ...req.body
  });
});

// DELETE vídeo
app.delete('/api/videos/:id', async (req, res) => {
  await db.collection('videos').doc(req.params.id).delete();
  res.sendStatus(200);
});

// =====================
// SERIES
// =====================

// GET séries
app.get('/api/series', async (req, res) => {
  const snapshot = await db.collection('series').get();

  const series = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  res.json(series);
});

// POST série
app.post('/api/series/by-url', async (req, res) => {
  const { title, seasonNumber, seriesThumbnail, episodes } = req.body;

  const newSeries = {
    title,
    thumbnail: seriesThumbnail || 'https://placehold.co/400x225',
    seasons: [
      {
        seasonNumber: Number(seasonNumber),
        episodes
      }
    ]
  };

  const doc = await db.collection('series').add(newSeries);

  res.json({
    id: doc.id,
    ...newSeries
  });
});

// ADD episódios
app.put('/api/series/:id/add-episodes', async (req, res) => {
  const { seasonNumber, episodes } = req.body;

  const ref = db.collection('series').doc(req.params.id);
  const doc = await ref.get();

  let data = doc.data();

  let season = data.seasons.find(s => s.seasonNumber == seasonNumber);

  if (!season) {
    data.seasons.push({
      seasonNumber: Number(seasonNumber),
      episodes
    });
  } else {
    season.episodes.push(...episodes);
  }

  await ref.update({ seasons: data.seasons });

  res.sendStatus(200);
});

// 🔥 REORDER episódios
app.put('/api/series/:id/seasons/:seasonNumber/reorder', async (req, res) => {
  const { episodes } = req.body;

  const ref = db.collection('series').doc(req.params.id);
  const doc = await ref.get();

  let data = doc.data();

  let season = data.seasons.find(s => s.seasonNumber == req.params.seasonNumber);

  if (!season) return res.sendStatus(404);

  season.episodes = episodes.map((ep, i) => ({
    ...ep,
    episodeNumber: i + 1
  }));

  await ref.update({ seasons: data.seasons });

  res.sendStatus(200);
});

// DELETE série
app.delete('/api/series/:id', async (req, res) => {
  await db.collection('series').doc(req.params.id).delete();
  res.sendStatus(200);
});

// DELETE episódio
app.delete('/api/series/:id/seasons/:seasonNumber/episodes/:episodeNumber', async (req, res) => {
  const ref = db.collection('series').doc(req.params.id);
  const doc = await ref.get();

  let data = doc.data();

  let season = data.seasons.find(s => s.seasonNumber == req.params.seasonNumber);

  if (!season) return res.sendStatus(404);

  season.episodes = season.episodes.filter(
    ep => ep.episodeNumber != req.params.episodeNumber
  );

  await ref.update({ seasons: data.seasons });

  res.sendStatus(200);
});

// =====================
// SERVER
// =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🔥 Firebase server rodando na porta ${PORT}`);
});