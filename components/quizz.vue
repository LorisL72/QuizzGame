<template>
  <div class="quiz p-4">
    <div class="mb-5 flex justify-center">
      <h2 class="p-5 text-4xl text-center text-white bg-blue-500 w-1/3 rounded-2xl">Quizz</h2>
    </div>
    <div v-if="!settingsConfirmed">
      <div class="mb-5 pb-5 flex border-b-4 border-blue-500 rounded">
        <h3 class="text-2xl">Paramètres du Quiz</h3>
      </div>
      <div class="mb-4">
        <label for="numberOfQuestions" class="block mb-2">Nombre de questions :</label>
        <input v-model.number="settings.numberOfQuestions" type="number" id="numberOfQuestions" min="1" class="p-2 border rounded w-full" />
      </div>
      <div class="mb-4">
        <label for="difficulty" class="block mb-2">Difficulté :</label>
        <select v-model="settings.difficulty" id="difficulty" class="p-2 border rounded w-full">
          <option value="easy">Facile</option>
          <option value="medium">Moyen</option>
          <option value="hard">Difficile</option>
        </select>
      </div>
      <div class="mb-4">
        <label for="category" class="block mb-2">Catégorie :</label>
        <select v-model="settings.category" id="category" class="p-2 border rounded w-full">
          <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
        </select>
      </div>
      <button @click="confirmSettings" class="p-2 bg-blue-500 text-white rounded">Confirmer les paramètres</button>
    </div>
    <div class="m-10" v-else-if="countdown > 0">
      <p class="flex flex-col items-center text-2xl">Le quizz commence dans <span class=" text-blue-500 flex p-10 text-8xl justify-center font-extrabold">{{ countdown }} </span></p>
    </div>
    <div v-else-if="question">
      <p v-html="question.question"></p>
      <ul class="mt-4">
        <li v-for="(answer, index) in allAnswers" :key="index" class="mb-2">
          <button @click="submitAnswer(answer)" class="p-2 bg-blue-500 text-white rounded w-full">{{ answer }}</button>
        </li>
      </ul>
      <p v-if="answerStatus !== null" class="mt-4">{{ answerStatus }}</p>
    </div>
    <div v-if="quizEnded">
      <div class="text-center">
        <h3 class="text-4xl mb-4">Jeu Terminé!</h3>
        <p class="text-2xl mb-4">Voici les résultats :</p>
        <ul class="mb-4">
          <li v-for="(user, index) in users" :key="index" class="user-result mb-2" :class="{ 'font-bold text-gold': index === 0 }">
            <p>{{ user.username }} - {{ user.correctAnswers }} bonnes réponses</p>
          </li>
        </ul>
        <button @click="restartQuiz" class="p-2 bg-blue-500 text-white rounded">Rejouer</button>
      </div>
    </div>
    <div v-else>
      <button @click="startQuiz" class="p-2 bg-blue-500 text-white rounded">Commencer le quiz</button>
    </div>
    <div class="users mt-4 ">
      <h3 class="text-2xl mb-4 border-b-2 p-2">Joueurs dans la partie :</h3>
      <ul class="bg-blue-200 p-3 w-1/2 rounded">
        <li class="m-5" v-for="user in users" :key="user.id">{{ user.username }} <span class="p-2 ml-5 rounded bg-blue-500 text-blue-50">{{ user.correctAnswers }} Points</span></li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  withCredentials: true,
  transports: ["websocket"]
});

const question = ref(null);
const lobbyId = ref(null);
const users = ref([]);
const allAnswers = ref([]);
const answerStatus = ref(null);
const countdown = ref(0);
const quizEnded = ref(false);
const categories = ref([]);
const settings = ref({
  numberOfQuestions: 5,
  difficulty: 'easy',
  category: 9 // Default to "General Knowledge"
});
const settingsConfirmed = ref(false);

const route = useRoute();
lobbyId.value = route.query.lobbyId;

socket.on('question', (receivedQuestion) => {
  console.log('Received question:', receivedQuestion);
  question.value = receivedQuestion;
  allAnswers.value = shuffle([receivedQuestion.answer, ...receivedQuestion.badAnswers]);
});

socket.on('lobbyUsers', (receivedUsers) => {
  console.log('Received users:', receivedUsers);
  users.value = receivedUsers;
});

socket.on('answerResult', (result) => {
  answerStatus.value = result.correct ? 'Bonne réponse!' : 'Mauvaise réponse.';
});

socket.on('quizEnd', (finalUsers) => {
  console.log('Quiz ended, final users:', finalUsers);
  users.value = finalUsers.sort((a, b) => b.correctAnswers - a.correctAnswers);
  quizEnded.value = true;
});

const joinLobby = () => {
  const username = prompt('Enter your username');
  console.log('Joining lobby:', lobbyId.value, 'as', username);
  socket.emit('joinLobby', lobbyId.value, username);
};

const confirmSettings = () => {
  socket.emit('setSettings', lobbyId.value, settings.value);
  settingsConfirmed.value = true;
};

const startQuiz = async () => {
  countdown.value = 3;

  const countdownInterval = setInterval(() => {
    countdown.value -= 1;
    console.log("Countdown: ", countdown.value);
    if (countdown.value === 0) {
      clearInterval(countdownInterval);
      console.log("Starting quiz with settings: ", settings.value);
      socket.emit('startQuiz', lobbyId.value, settings.value);
    }
  }, 1000);
};

const submitAnswer = (answer) => {
  socket.emit('submitAnswer', lobbyId.value, answer);
};

const shuffle = (array) => {
  return array.sort(() => Math.random() - 0.5);
};

const fetchCategories = async () => {
  try {
    const response = await fetch('https://opentdb.com/api_category.php');
    const data = await response.json();
    categories.value = data.trivia_categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
  }
};

const restartQuiz = () => {
  settingsConfirmed.value = false;
  quizEnded.value = false;
  question.value = null;
  allAnswers.value = [];
  answerStatus.value = null;
  countdown.value = 0;
};

onMounted(() => {
  joinLobby();
  fetchCategories();
});
</script>
