import { createRouter, createWebHistory } from "vue-router";
import LobbyView from "../views/LobbyView.vue";
import GameView from "../views/GameView.vue";

const routes = [
  { path: "/", component: LobbyView },
  { path: "/game", component: GameView },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
