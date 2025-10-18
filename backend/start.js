import app from './server.js';

const port = process.env.PORT;
app.listen(port, () => {
  console.log(`🚀 Servidor iniciado na porta: ${port}`);
});
