import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import axios from 'axios';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        credentials: true,
    },
});

app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
}));

app.use(express.json());

const lobbies = {};

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('createLobby', (lobbyName) => {
        const lobbyId = Date.now().toString();
        lobbies[lobbyId] = { id: lobbyId, name: lobbyName, users: [], currentQuestion: 0, questions: [], settings: {} };
        io.emit('lobbyList', Object.values(lobbies));
    });

    socket.on('joinLobby', (lobbyId, username) => {
        if (lobbies[lobbyId]) {
            lobbies[lobbyId].users.push({ id: socket.id, username, hasAnswered: false, correctAnswers: 0 });
            socket.join(lobbyId);
            io.to(lobbyId).emit('lobbyUsers', lobbies[lobbyId].users);
        }
    });

    socket.on('setSettings', (lobbyId, settings) => {
        if (lobbies[lobbyId]) {
            lobbies[lobbyId].settings = settings;
            io.to(lobbyId).emit('settingsUpdated', settings);
        }
    });

    socket.on('startQuiz', async (lobbyId) => {
        if (lobbies[lobbyId]) {
            const { numberOfQuestions, difficulty, category } = lobbies[lobbyId].settings;
            try {
                const response = await axios.get(`https://opentdb.com/api.php?amount=${numberOfQuestions}&category=${category}&difficulty=${difficulty}&type=multiple`);
                lobbies[lobbyId].questions = response.data.results.map(q => ({
                    question: q.question,
                    answer: q.correct_answer,
                    badAnswers: q.incorrect_answers
                }));
                lobbies[lobbyId].currentQuestion = 0;
                io.to(lobbyId).emit('question', lobbies[lobbyId].questions[0]);
            } catch (error) {
                console.error('Error fetching quiz data:', error);
            }
        }
    });

    socket.on('submitAnswer', (lobbyId, answer) => {
        if (lobbies[lobbyId]) {
            const user = lobbies[lobbyId].users.find(user => user.id === socket.id);
            if (user && !user.hasAnswered) {
                user.hasAnswered = true;
                const isCorrect = answer === lobbies[lobbyId].questions[lobbies[lobbyId].currentQuestion].answer;
                if (isCorrect) {
                    user.correctAnswers += 1;
                }
                socket.emit('answerResult', { correct: isCorrect });

                if (lobbies[lobbyId].users.every(user => user.hasAnswered)) {
                    lobbies[lobbyId].currentQuestion++;
                    if (lobbies[lobbyId].currentQuestion < lobbies[lobbyId].questions.length) {
                        lobbies[lobbyId].users.forEach(user => user.hasAnswered = false);
                        io.to(lobbyId).emit('question', lobbies[lobbyId].questions[lobbies[lobbyId].currentQuestion]);
                    } else {
                        io.to(lobbyId).emit('quizEnd', lobbies[lobbyId].users);
                    }
                    io.to(lobbyId).emit('lobbyUsers', lobbies[lobbyId].users);
                }
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        for (const lobbyId in lobbies) {
            const userIndex = lobbies[lobbyId].users.findIndex((user) => user.id === socket.id);
            if (userIndex !== -1) {
                lobbies[lobbyId].users.splice(userIndex, 1);
                io.to(lobbyId).emit('lobbyUsers', lobbies[lobbyId].users);
            }
        }
    });
});

server.listen(5000, () => {
    console.log('Server running on port 5000');
});
