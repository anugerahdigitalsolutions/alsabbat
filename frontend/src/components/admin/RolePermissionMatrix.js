import React from 'react';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

export const RolePermissionMatrix = ({ roles = [] }) => (
  <div className="overflow-x-auto" data-testid="role-permission-matrix">
    <Table>
      <TableHeader>
        <TableRow style={{ backgroundColor: 'rgba(1,40,145,0.04)' }}>
          <TableHead className="min-w-[180px]">Role</TableHead>
          <TableHead className="min-w-[260px]">Deskripsi</TableHead>
          <TableHead>Permissions (backend-enforced)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {roles.map((role) => (
          <TableRow key={role.value} data-testid={`role-row-${role.value}`}>
            <TableCell className="font-medium">{role.label}</TableCell>
            <TableCell className="text-sm" style={{ color: 'var(--muted-fg)' }}>
              {role.description}
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1.5">
                {(role.permissions || []).map((permission) => (
                  <Badge
                    key={permission}
                    variant="outline"
                    className="font-mono text-[11px]"
                    style={{
                      backgroundColor: permission === '*' ? 'rgba(252,207,43,0.16)' : 'rgba(1,40,145,0.05)',
                      borderColor: permission === '*' ? 'rgba(252,207,43,0.55)' : 'var(--border-soft)',
                    }}
                  >
                    {permission === '*' ? 'FULL ACCESS' : permission}
                  </Badge>
                ))}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export default RolePermissionMatrix;
