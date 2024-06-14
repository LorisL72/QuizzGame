<template>
  <div class="lobby p-4">
    <h2 class="text-2xl mb-4">Liste des lobbys</h2>
    <ul class="mb-4">
      <li v-for="lobby in lobbies" :key="lobby.id" class="mb-2">
        <a @click="joinLobby(lobby.id)" class="text-blue-500 cursor-pointer hover:underline">{{ lobby.name }}</a>
      </li>
    </ul>
    <div class="flex items-center">
      <input v-model="newLobbyName" placeholder="Nom du lobby" class="p-2 border rounded mr-2 w-full" />
      <button @click="createLobby" class="p-2 bg-blue-500 text-white rounded">Créer un nouveau lobby</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  withCredentials: true,
  transports: ["websocket"]
});

const lobbies = ref([]);
const newLobbyName = ref('');

onMounted(async () => {
  socket.on('lobbyList', (newLobbies) => {
    lobbies.value = newLobbies;
  });
});

const createLobby = () => {
  socket.emit('createLobby', newLobbyName.value);
  newLobbyName.value = '';
};

const joinLobby = (lobbyId) => {
  socket.emit('joinLobby', lobbyId);
  window.location.href = `/QuizzGame/Quizz?lobbyId=${lobbyId}`; // Assurez-vous que cette route existe
};

</script>
