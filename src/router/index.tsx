import { createBrowserRouter } from 'react-router-dom'
import { GamePage } from '../components/GamePage'
import { HomePage } from '../components/HomePage'
import { ResultPage } from '../components/ResultPage'
import { StoriesPage } from '../components/StoriesPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/game/:id',
    element: <GamePage />,
  },
  {
    path: '/result/:id',
    element: <ResultPage />,
  },
  {
    path: '/stories',
    element: <StoriesPage />,
  },
])
