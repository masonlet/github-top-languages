export const DEFAULT_CONFIG = {
  TITLE: 'Top Languages',
  WIDTH: 400,
  HEIGHT: 300,
  COUNT: 8
}

export const LAYOUT = {
  DEFAULT: {
    CHART_CENTER_X: 150,
    LEGEND_START_X: 270
  },
  SHIFTED: {
    CHART_CENTER_X: 100,
    LEGEND_START_X: 200
  }
}

export const DONUT_GEOMETRY = {
  CENTER_Y: 170,
  OUTER_RADIUS: 80,
  INNER_RADIUS: 50
}

export const TITLE_STYLES = {
  TEXT_Y: 30,
  FONT_SIZE: 24
}

export const LEGEND_STYLES = {
  START_Y: 80,
  ROW_HEIGHT: 25,
  SQUARE_SIZE: 12,
  SQUARE_RADIUS: 2,
  FONT_SIZE: 11
}

export const ERROR_STYLES = {
  TEXT_Y: 100,
  FONT_SIZE: 18,
  COLOUR: '#ff6b6b'
}

export const THEMES = {
  default: {
    bg: '#0d1117',
    text: '#ffffff',
    colours: ['#A8D5Ba', '#FFD6A5', '#FFAAA6', '#D0CFCF', '#CBAACB', '#FFE156', '#96D5E9', '#F3B0C3']
  },
  light: {
    bg: '#ffffff',
    text: '#2f2f2f',
    colours: ['#2ecc71', '#3498db', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e']
  },
  dark: {
    bg: '#1a1a1a',
    text: '#ccd6f6',
    colours: ['#ff6b6b', '#4ecdc3', '#45b7d1', '#ffa07a', '#98d8c8', '#f7dc6f', '#bb8fce', '#85c1e2']
  }
};

export const REFRESH_INTERVAL = 1000 * 60 * 60;
export const MAX_COUNT = 16;
export const LEGEND_SHIFT_THRESHOLD = 8;
export const FULL_CIRCLE_ANGLE = 359.9999;
