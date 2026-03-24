import { makeAutoObservable } from 'mobx';

export interface UserData {
  name: string;
  email: string;
  picture: string;
  token: string;
}

class UserStore {
  user: UserData | null = null;

  constructor() {
    makeAutoObservable(this);
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const saved = localStorage.getItem('scubex_user');
    if (saved) {
      try {
        this.user = JSON.parse(saved);
      } catch {
        localStorage.removeItem('scubex_user');
      }
    }
  }

  setUser(user: UserData) {
    this.user = user;
    localStorage.setItem('scubex_user', JSON.stringify(user));
  }

  logout() {
    this.user = null;
    localStorage.removeItem('scubex_user');
  }

  get isLoggedIn() {
    return this.user !== null;
  }

  get token() {
    return this.user?.token ?? null;
  }
}

export default UserStore;
