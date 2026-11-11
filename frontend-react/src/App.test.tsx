import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App'

test('renders the placeholder', () => {
  render(<App />)
  expect(screen.getByText('File Browser')).toBeInTheDocument()
  expect(screen.getByRole('button')).toBeEnabled()
})
