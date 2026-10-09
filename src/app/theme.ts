import { createTheme, type MantineColorsTuple } from '@mantine/core';

const ai: MantineColorsTuple = [
  '#F2FFF8',
  '#C8FFE0',
  '#7AFFB4',
  '#33FF9A',
  '#00FF84',
  '#00E076',
  '#00C45F',
  '#009E4F',
  '#007A3D',
  '#005C32',
];

const ink: MantineColorsTuple = [
  '#F5F5F5',
  '#E0E0E0',
  '#BDBDBD',
  '#757575',
  '#424242',
  '#2A2A2A',
  '#1A1A1A',
  '#111111',
  '#0A0A0A',
  '#000000',
];

/** Black surfaces for Mantine dark scheme */
const dark: MantineColorsTuple = [
  '#F2F2F2',
  '#8A8A8A',
  '#5A5A5A',
  '#3A3A3A',
  '#2A2A2A',
  '#1A1A1A',
  '#141414',
  '#111111',
  '#0A0A0A',
  '#000000',
];

/** Black app surfaces · AI green buttons / accents */
export const theme = createTheme({
  primaryColor: 'ai',
  primaryShade: 4,
  fontFamily: "'Segoe UI', 'IBM Plex Sans', system-ui, sans-serif",
  fontFamilyMonospace:
    "'Cascadia Code', Consolas, 'SF Mono', ui-monospace, monospace",
  defaultRadius: 'sm',
  white: '#F2F2F2',
  black: '#111111',
  colors: {
    ai,
    ink,
    dark,
  },
  components: {
    Button: {
      defaultProps: {
        color: 'ai',
      },
      styles: {
        root: {
          '&[data-variant="filled"]': {
            color: '#111111',
            fontWeight: 600,
          },
        },
      },
    },
    SegmentedControl: {
      defaultProps: {
        color: 'ai',
      },
      styles: {
        root: {
          backgroundColor: '#1A1A1A',
        },
        label: {
          color: '#F2F2F2',
          '&[data-active]': {
            color: '#111111',
          },
        },
        indicator: {
          backgroundColor: '#00FF84',
        },
      },
    },
    Tabs: {
      defaultProps: {
        color: 'ai',
      },
    },
    TextInput: {
      defaultProps: {
        color: 'ai',
      },
    },
  },
});
