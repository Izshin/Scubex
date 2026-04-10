import { makeAutoObservable, runInAction } from 'mobx';
import { updateProfile } from '../api';

export interface UserData {
  name: string;
  email: string;
  picture: string;
  token: string;
}

class UserStore {
  user: UserData | null = null;
  profileLoading = false;
  profileError: string | null = null;

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

  async updateProfile(customName: string, customPictureUrl: string) {
    this.profileLoading = true;
    this.profileError = null;
    try {
      const data = await updateProfile(customName, customPictureUrl);
      runInAction(() => {
        this.setUser({ ...data.user, token: data.token });
        this.profileLoading = false;
      });
    } catch (e) {
      runInAction(() => {
        this.profileError = e instanceof Error ? e.message : 'Error updating profile';
        this.profileLoading = false;
      });
    }
  }
}

export default UserStore;
