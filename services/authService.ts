
import type { User } from '../types';

const USERS_KEY = 'sarc_users_v2';
const SESSION_KEY = 'sarc_session_v2';

// Helper to get users from localStorage
const getUsers = (): Record<string, User> => {
    try {
        const users = localStorage.getItem(USERS_KEY);
        return users ? JSON.parse(users) : {};
    } catch (e) {
        return {};
    }
};

// Helper to save users to localStorage
const saveUsers = (users: Record<string, User>) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const signup = (email: string, name: string, password: string):User | null => {
    const users = getUsers();
    if (users[email]) {
        throw new Error("Un compte existe déjà avec cet email.");
    }
    const newUser: User = {
        id: `user_${Date.now()}`,
        email,
        name,
    };
    // In a real app, we would store a hashed password.
    // Here we just store the user object.
    users[email] = newUser;
    saveUsers(users);
    // Also log them in
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    return newUser;
};

export const login = (email: string, password: string):User | null => {
    const users = getUsers();
    const user = users[email];
    // In a real app, we would compare hashed passwords.
    // For this simulation, we just check if the user exists.
    if (user) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user;
    }
    throw new Error("Email ou mot de passe incorrect.");
};

export const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
    try {
        const user = sessionStorage.getItem(SESSION_KEY);
        return user ? JSON.parse(user) : null;
    } catch (e) {
        return null;
    }
};
