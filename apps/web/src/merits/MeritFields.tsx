import {
  emptyFormValues,
  type FieldDef,
  type FieldDefs,
  isVisible,
  monthsBetween,
} from '@docunex/shared';
import {
  ActionIcon,
  Button,
  Checkbox,
  Grid,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useEffect, useRef } from 'react';
import {
  Controller,
  type ControllerRenderProps,
  get,
  type RefCallBack,
  useFieldArray,
  useFormContext,
  useFormState,
  useWatch,
} from 'react-hook-form';

/**
 * Pinta los campos de un tipo de mérito a partir de sus metadatos del catálogo. Los nombres de los
 * campos del formulario son `${prefix}.${campo}`.
 */
export function MeritFields({ defs, prefix }: { defs: FieldDefs; prefix: string }) {
  const values = (useWatch({ name: prefix }) ?? {}) as Record<string, unknown>;
  const visible = Object.entries(defs).filter(([, def]) => isVisible(def, values));

  return (
    <Grid>
      {visible.map(([name, def]) => (
        <Grid.Col key={name} span={{ base: 12, sm: def.span }}>
          <FieldInput prefix={prefix} name={name} def={def} />
        </Grid.Col>
      ))}
    </Grid>
  );
}

function FieldInput({ prefix, name, def }: { prefix: string; name: string; def: FieldDef }) {
  const path = `${prefix}.${name}`;
  if (def.kind === 'list') return <ListField path={path} def={def} />;
  if (def.kind === 'decimal' && def.monthsBetween) {
    return <MonthsField prefix={prefix} path={path} def={def} />;
  }
  return (
    <Controller
      name={path}
      render={({ field: { ref, ...field }, fieldState }) => (
        <Widget def={def} field={field} inputRef={ref} error={fieldState.error?.message} />
      )}
    />
  );
}

function Widget({
  def,
  field,
  inputRef,
  error,
}: {
  def: Exclude<FieldDef, { kind: 'list' }>;
  field: Omit<ControllerRenderProps, 'ref'>;
  /** Para que react-hook-form lleve el foco al primer campo con error. */
  inputRef: RefCallBack;
  error?: string;
}) {
  const common = {
    label: def.label,
    description: def.help,
    placeholder: def.placeholder,
    withAsterisk: def.required,
    error,
    onBlur: field.onBlur,
  };

  switch (def.kind) {
    case 'text':
      return def.multiline ? (
        <Textarea
          {...common}
          ref={inputRef}
          autosize
          minRows={1}
          maxRows={6}
          value={(field.value as string | null) ?? ''}
          onChange={(event) => field.onChange(event.currentTarget.value)}
        />
      ) : (
        <TextInput
          {...common}
          ref={inputRef}
          value={(field.value as string | null) ?? ''}
          onChange={(event) => field.onChange(event.currentTarget.value)}
        />
      );
    case 'integer':
    case 'decimal':
    case 'year':
      return (
        <NumberInput
          {...common}
          ref={inputRef}
          value={(field.value as number | string | null) ?? ''}
          // Mantine devuelve '' al vaciar y una cadena si el valor no es un número seguro;
          // la cadena llega al esquema, que la marca como no válida.
          onChange={(value) => field.onChange(value === '' ? null : value)}
          min={def.kind === 'year' ? undefined : def.min}
          max={def.kind === 'year' ? undefined : def.max}
          allowDecimal={def.kind === 'decimal'}
          decimalScale={def.kind === 'decimal' ? def.decimals : 0}
          decimalSeparator=","
          allowNegative={false}
          hideControls={def.kind !== 'integer'}
        />
      );
    case 'date':
      return (
        <DateInput
          {...common}
          ref={inputRef}
          valueFormat="DD/MM/YYYY"
          clearable
          value={(field.value as string | null) ?? null}
          onChange={field.onChange}
        />
      );
    case 'boolean':
      return (
        <Checkbox
          ref={inputRef}
          label={def.label}
          description={def.help}
          error={error}
          // Alineada con los campos de al lado, que tienen etiqueta encima.
          mt={def.span < 12 ? { sm: 30 } : undefined}
          checked={Boolean(field.value)}
          onChange={(event) => field.onChange(event.currentTarget.checked)}
          onBlur={field.onBlur}
        />
      );
    case 'select':
      return (
        <Select
          {...common}
          ref={inputRef}
          data={def.options.map(({ value, label }) => ({ value, label }))}
          value={(field.value as string | null) ?? null}
          onChange={field.onChange}
          clearable={!def.required}
          allowDeselect={!def.required}
        />
      );
  }
}

/** Meses: se proponen a partir de las fechas mientras el usuario no los cambie a mano. */
function MonthsField({
  prefix,
  path,
  def,
}: {
  prefix: string;
  path: string;
  def: Extract<FieldDef, { kind: 'decimal' }>;
}) {
  const { getValues, setValue } = useFormContext();
  const range = def.monthsBetween!;
  const [start, end] = useWatch({
    name: [`${prefix}.${range.start}`, `${prefix}.${range.end}`],
  }) as [string | null, string | null];
  const suggested = monthsBetween(start, end);
  const lastSuggested = useRef(suggested);

  useEffect(() => {
    const current = getValues(path) as unknown;
    if (suggested !== null && (current === null || current === lastSuggested.current)) {
      setValue(path, suggested, { shouldDirty: true });
    }
    lastSuggested.current = suggested;
  }, [suggested, path, getValues, setValue]);

  return (
    <Controller
      name={path}
      render={({ field: { ref, ...field }, fieldState }) => (
        <Widget def={def} field={field} inputRef={ref} error={fieldState.error?.message} />
      )}
    />
  );
}

function ListField({ path, def }: { path: string; def: Extract<FieldDef, { kind: 'list' }> }) {
  const { fields, append, remove } = useFieldArray({ name: path });
  const { errors } = useFormState({ name: path });
  const listError = (get(errors, path) as { message?: string } | undefined)?.message;

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        {def.label}
      </Text>
      {fields.map((item, index) => (
        <Paper key={item.id} withBorder p="xs">
          <Group align="flex-start" wrap="nowrap">
            <Text size="sm" c="dimmed" mt={30} w={20}>
              {index + 1}.
            </Text>
            <div style={{ flex: 1 }}>
              <MeritFields defs={def.fields} prefix={`${path}.${index}`} />
            </div>
            <ActionIcon
              variant="subtle"
              color="red"
              mt={30}
              aria-label={`Quitar ${def.itemLabel}`}
              onClick={() => remove(index)}
            >
              <IconTrash size={18} />
            </ActionIcon>
          </Group>
        </Paper>
      ))}
      {listError && (
        <Text size="xs" c="red">
          {listError}
        </Text>
      )}
      <Group>
        <Button
          variant="light"
          size="sm"
          leftSection={<IconPlus size={16} />}
          disabled={fields.length >= def.max}
          onClick={() => append(emptyFormValues(def.fields))}
        >
          Añadir {def.itemLabel}
        </Button>
      </Group>
    </Stack>
  );
}
