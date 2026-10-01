import {
  ActionIcon,
  Anchor,
  Autocomplete,
  Badge,
  Button,
  Checkbox,
  createTheme,
  type CSSVariablesResolver,
  FileInput,
  Menu,
  Modal,
  MultiSelect,
  NavLink,
  NumberInput,
  PasswordInput,
  Radio,
  rem,
  SegmentedControl,
  Select,
  Stepper,
  Switch,
  Table,
  TagsInput,
  Textarea,
  TextInput,
} from '@mantine/core';

/**
 * Tema de la aplicación. Los tamaños por defecto de Mantine (botones de 36 px, texto de 14 px en
 * tablas y campos) se quedan pequeños en pantallas grandes, así que se suben de forma centralizada:
 * botones y campos en tamaño `md`, iconos de acción más grandes y texto base más legible. El
 * tamaño de letra de `html` también crece con el ancho de la ventana (ver `styles.css`) y todo lo
 * que Mantine mide en `rem` escala con él.
 */
export const theme = createTheme({
  primaryColor: 'indigo',
  // El tono 6 de índigo con texto blanco no llega al contraste AA (4,5:1); el 7 sí.
  primaryShade: { light: 7, dark: 8 },
  defaultRadius: 'md',
  cursorType: 'pointer',
  fontSizes: {
    xs: rem(13),
    sm: rem(15),
    md: rem(16),
    lg: rem(18),
    xl: rem(21),
  },
  headings: {
    fontWeight: '700',
    sizes: {
      h1: { fontSize: rem(36), lineHeight: '1.25' },
      h2: { fontSize: rem(30), lineHeight: '1.3' },
      h3: { fontSize: rem(23), lineHeight: '1.35' },
      h4: { fontSize: rem(19), lineHeight: '1.4' },
    },
  },
  components: {
    Button: Button.extend({ defaultProps: { size: 'md' } }),
    // 34 px: área de pulsación cómoda para los iconos de editar, borrar, subir, bajar...
    ActionIcon: ActionIcon.extend({ defaultProps: { size: 'lg' } }),
    // Enlaces siempre subrayados: se distinguen del texto sin depender solo del color.
    Anchor: Anchor.extend({ defaultProps: { underline: 'always' } }),
    // El tamaño `md` de Mantine usa letra de 11 px; `lg` (13 px) se lee mejor.
    Badge: Badge.extend({ defaultProps: { size: 'lg' } }),
    TextInput: TextInput.extend({ defaultProps: { size: 'md' } }),
    PasswordInput: PasswordInput.extend({ defaultProps: { size: 'md' } }),
    NumberInput: NumberInput.extend({ defaultProps: { size: 'md' } }),
    Textarea: Textarea.extend({ defaultProps: { size: 'md' } }),
    Select: Select.extend({ defaultProps: { size: 'md' } }),
    MultiSelect: MultiSelect.extend({ defaultProps: { size: 'md' } }),
    Autocomplete: Autocomplete.extend({ defaultProps: { size: 'md' } }),
    TagsInput: TagsInput.extend({ defaultProps: { size: 'md' } }),
    FileInput: FileInput.extend({ defaultProps: { size: 'md' } }),
    // Componentes de @mantine/dates: se configuran por nombre sin importar el paquete aquí.
    DateInput: { defaultProps: { size: 'md' } },
    DatePickerInput: { defaultProps: { size: 'md' } },
    Checkbox: Checkbox.extend({ defaultProps: { size: 'md' } }),
    Radio: Radio.extend({ defaultProps: { size: 'md' } }),
    Switch: Switch.extend({ defaultProps: { size: 'md' } }),
    SegmentedControl: SegmentedControl.extend({ defaultProps: { size: 'md' } }),
    Stepper: Stepper.extend({ defaultProps: { size: 'md' } }),
    Menu: Menu.extend({ styles: { item: { fontSize: 'var(--mantine-font-size-md)' } } }),
    Modal: Modal.extend({
      defaultProps: { size: 'lg' },
      styles: { title: { fontSize: 'var(--mantine-font-size-xl)', fontWeight: 700 } },
    }),
    NavLink: NavLink.extend({
      styles: {
        root: { minHeight: rem(48), borderRadius: 'var(--mantine-radius-md)' },
        label: { fontSize: 'var(--mantine-font-size-md)', fontWeight: 500 },
      },
    }),
    Table: Table.extend({
      defaultProps: { verticalSpacing: 'sm', horizontalSpacing: 'md' },
      styles: { table: { fontSize: 'var(--mantine-font-size-md)' } },
    }),
  },
});

/**
 * El gris "dimmed" por defecto (gray.6 sobre blanco, ~3,3:1) no alcanza el contraste AA para
 * texto; se usa un tono más oscuro en claro y uno más claro en oscuro.
 */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: { '--mantine-color-dimmed': 'var(--mantine-color-gray-7)' },
  dark: { '--mantine-color-dimmed': 'var(--mantine-color-dark-1)' },
});
