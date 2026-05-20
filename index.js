const admin = require("firebase-admin");

const serviceAccount = require("./auxescolar-firebase-adminsdk-fbsvc-f200ff632e.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),

    databaseURL:
        "https://auxescolar-default-rtdb.firebaseio.com"
});

const db = admin.database();

require("dotenv").config();

const express = require("express");
const axios = require("axios");
const Groq = require("groq-sdk");

const app = express();

app.use(express.json());

const TOKEN = process.env.TOKEN_TELEGRAM;

const TELEGRAM_API =
    `https://api.telegram.org/bot${TOKEN}`;

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

app.post("/webhook", async (req, res) => {

    try {

        const mensagem = req.body.message;

        if (!mensagem || !mensagem.text) {
            return res.sendStatus(200);
        }

        const chatId = mensagem.chat.id;

        const textoUsuario = mensagem.text;

        console.log("Pergunta:", textoUsuario);

        const provasRef = db.ref("provas");

        const dadosRef = db.ref("/");

        const snapshot = await dadosRef.once("value");

        const dadosEscola = snapshot.val();

        let contextoSistema = "";

        contextoSistema += `
PROVAS:
${JSON.stringify(dadosEscola.provas, null, 2)}

SIMULADOS:
${JSON.stringify(dadosEscola.simulados, null, 2)}

HORÁRIOS:
${JSON.stringify(dadosEscola.horarios, null, 2)}

AVISOS:
${JSON.stringify(dadosEscola.avisos, null, 2)}

PROFESSORES:
${JSON.stringify(dadosEscola.professores, null, 2)}

DISCIPLINAS:
${JSON.stringify(dadosEscola.disciplinas, null, 2)}
`;

        const respostaIA =
            await groq.chat.completions.create({

                messages: [

                    {
                        role: "system",

                        content:
                            `Você é um assistente virtual escolar.

Estas são as datas das provas:

${contextoSistema}

Responda perguntas escolares
de forma objetiva e educada.`
                    },

                    {
                        role: "user",
                        content: textoUsuario
                    }
                ],

                model: "llama-3.3-70b-versatile"
            });

        const resposta =
            respostaIA.choices[0].message.content;

        await axios.post(
            `${TELEGRAM_API}/sendMessage`,
            {
                chat_id: chatId,
                text: resposta
            }
        );

        res.sendStatus(200);

    } catch (erro) {

        console.log(erro);

        res.sendStatus(500);
    }
});

app.get("/", (req, res) => {
    res.send("Servidor online");
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log(
        `Servidor rodando na porta ${PORT}`
    );
});