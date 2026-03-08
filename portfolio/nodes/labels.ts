/**
 * Bilingual display labels for every node in the graph.
 *
 * Keys are the templateKey values used throughout the app.
 * Add a key here whenever you add a new node to structure.ts.
 */

import type { Language } from '../types'
import { fullName } from '../identity'

export const mainNodeLabel: Record<Language, string> = {
  en: fullName,
  fr: fullName,
}

export const nodeLabels: Record<Language, Record<string, string>> = {
  en: {
    about: 'Profile',
    projects: 'Projects',
    experience: 'Experience',
    mail: 'Contact',
    github: 'GitHub',
    'about-story': 'My Background',
    'about-interests': 'My Interests',
    'about-location': 'Your City, Country',
    'interest-1': 'Field of Interest 1',
    'interest-2': 'Field of Interest 2',
    'topic-1-1': 'Topic 1.1',
    'topic-1-2': 'Topic 1.2',
    'topic-2-1': 'Topic 2.1',
    'topic-2-2': 'Topic 2.2',
    'diploma-1': 'Degree 1',
    'diploma-2': 'Degree 2',
    'project-1': 'Project 1',
    'project-2': 'Project 2',
    'project-3': 'Project 3',
    'exp-2': 'Year 2 · Role 2',
    'exp-1': 'Year 1 · Role 1',
  },
  fr: {
    about: 'À propos',
    projects: 'Projets',
    experience: 'Expérience',
    mail: 'Contact',
    github: 'GitHub',
    'about-story': 'Mon parcours',
    'about-interests': "Mes centres d'intérêt",
    'about-location': 'Votre ville, Pays',
    'interest-1': "Domaine d'intérêt 1",
    'interest-2': "Domaine d'intérêt 2",
    'topic-1-1': 'Sujet 1.1',
    'topic-1-2': 'Sujet 1.2',
    'topic-2-1': 'Sujet 2.1',
    'topic-2-2': 'Sujet 2.2',
    'diploma-1': 'Diplôme 1',
    'diploma-2': 'Diplôme 2',
    'project-1': 'Projet 1',
    'project-2': 'Projet 2',
    'project-3': 'Projet 3',
    'exp-2': 'Année 2 · Rôle 2',
    'exp-1': 'Année 1 · Rôle 1',
  },
}
