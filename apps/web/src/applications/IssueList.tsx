import type { ValidationIssue } from '@docunex/shared';
import { Alert, Anchor, List, Text } from '@mantine/core';
import { IconAlertTriangle, IconCircleX } from '@tabler/icons-react';
import { Link } from 'react-router';

/** Dónde se corrige cada tipo de error. */
function fixLink(issue: ValidationIssue): { to: string; label: string } | null {
  if (issue.meritId) return { to: `/meritos/${issue.meritId}`, label: 'Abrir el mérito' };
  if (issue.documentId) return { to: '/documentos', label: 'Ir a documentos' };
  if (issue.code === 'PROFILE_INCOMPLETE') return { to: '/perfil', label: 'Ir al perfil' };
  if (issue.code.startsWith('POSITION_')) return { to: '/plazas', label: 'Ir a plazas' };
  return null;
}

export function IssueList({
  issues,
  kind,
  title,
}: {
  issues: ValidationIssue[];
  kind: 'error' | 'warning';
  title: string;
}) {
  if (issues.length === 0) return null;
  return (
    <Alert
      color={kind === 'error' ? 'red' : 'yellow'}
      variant="light"
      title={title}
      icon={kind === 'error' ? <IconCircleX /> : <IconAlertTriangle />}
    >
      <List size="sm" spacing={4}>
        {issues.map((issue, index) => {
          const link = fixLink(issue);
          return (
            <List.Item key={index}>
              <Text span size="sm">
                {issue.message}
              </Text>
              {link && (
                <>
                  {' '}
                  <Anchor component={Link} to={link.to} size="sm">
                    {link.label}
                  </Anchor>
                </>
              )}
            </List.Item>
          );
        })}
      </List>
    </Alert>
  );
}
