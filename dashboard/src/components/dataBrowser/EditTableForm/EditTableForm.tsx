import type {
  BaseTableFormProps,
  BaseTableFormValues,
} from '@/components/dataBrowser/BaseTableForm';
import BaseTableForm, {
  baseTableValidationSchema,
} from '@/components/dataBrowser/BaseTableForm';
import useTableQuery from '@/hooks/dataBrowser/useTableQuery';
import useTrackForeignKeyRelationsMutation from '@/hooks/dataBrowser/useTrackForeignKeyRelationsMutation';
import useUpdateTableMutation from '@/hooks/dataBrowser/useUpdateTableMutation';
import type {
  DatabaseTable,
  NormalizedQueryDataRow,
} from '@/types/dataBrowser';
import { Alert } from '@/ui/Alert';
import ActivityIndicator from '@/ui/v2/ActivityIndicator';
import Button from '@/ui/v2/Button';
import normalizeDatabaseColumn from '@/utils/dataBrowser/normalizeDatabaseColumn';
import { triggerToast } from '@/utils/toast';
import { yupResolver } from '@hookform/resolvers/yup';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

export interface EditTableFormProps
  extends Pick<BaseTableFormProps, 'onCancel'> {
  /**
   * Schema where the table is located.
   */
  schema: string;
  /**
   * Table to be edited.
   */
  table: NormalizedQueryDataRow;
  /**
   * Function to be called when the form is submitted.
   */
  onSubmit?: () => Promise<void>;
}

export default function EditTableForm({
  onSubmit,
  schema,
  table: originalTable,
  ...props
}: EditTableFormProps) {
  const [formInitialized, setFormInitialized] = useState(false);
  const router = useRouter();

  const {
    data,
    status: columnsStatus,
    error: columnsError,
  } = useTableQuery([`default.${schema}.${originalTable.table_name}`], {
    schema,
    table: originalTable.table_name,
  });

  const { columns, foreignKeyRelations } = data || {
    columns: [],
    foreignKeyRelations: [],
  };

  const dataGridColumns = (columns || []).map((column) =>
    normalizeDatabaseColumn(column),
  );

  const {
    mutateAsync: trackForeignKeyRelations,
    error: foreignKeyError,
    reset: resetForeignKeyError,
  } = useTrackForeignKeyRelationsMutation();

  const {
    mutateAsync: updateTable,
    error: updateError,
    reset: resetUpdateError,
  } = useUpdateTableMutation({ schema });

  const error = columnsError || updateError || foreignKeyError;

  function resetError() {
    resetForeignKeyError();
    resetUpdateError();
  }

  const form = useForm<BaseTableFormValues>({
    defaultValues: {
      name: originalTable.table_name,
      columns: [],
      primaryKeyIndex: null,
      identityColumnIndex: null,
      foreignKeyRelations: [],
    },
    reValidateMode: 'onSubmit',
    resolver: yupResolver(baseTableValidationSchema),
  });

  // We are initializing the form values lazily, because columns are not
  // necessarily available immediately when the form is mounted.
  useEffect(() => {
    if (
      columnsStatus === 'success' &&
      dataGridColumns.length > 0 &&
      !formInitialized
    ) {
      const primaryColumnIndex = dataGridColumns.findIndex(
        (column) => column.isPrimary,
      );
      const identityColumnIndex = dataGridColumns.findIndex(
        (column) => column.isIdentity,
      );

      form.reset({
        name: originalTable.table_name,
        columns: dataGridColumns.map((column) => ({
          // ID can't be changed through the form, so we can use it to
          // identify the column in the original array.
          id: column.id,
          name: column.id,
          type: column.type,
          defaultValue: column.defaultValue,
          isNullable: column.isNullable,
          isUnique: column.isUnique,
        })),
        primaryKeyIndex: primaryColumnIndex > -1 ? primaryColumnIndex : null,
        identityColumnIndex:
          identityColumnIndex > -1 ? identityColumnIndex : null,
        foreignKeyRelations,
      });

      setFormInitialized(true);
    }
  }, [
    form,
    originalTable,
    columnsStatus,
    foreignKeyRelations,
    dataGridColumns,
    formInitialized,
  ]);

  async function handleSubmit(values: BaseTableFormValues) {
    try {
      const updatedTable: DatabaseTable = {
        ...values,
        primaryKey: values.columns[values.primaryKeyIndex]?.name,
        identityColumn:
          values.identityColumnIndex !== null &&
          typeof values.identityColumnIndex !== 'undefined'
            ? values.columns[values.identityColumnIndex]?.name
            : undefined,
      };

      await updateTable({
        originalTable,
        originalColumns: dataGridColumns,
        originalForeignKeyRelations: foreignKeyRelations,
        updatedTable,
      });

      if (updatedTable.foreignKeyRelations?.length > 0) {
        await trackForeignKeyRelations({
          foreignKeyRelations: updatedTable.foreignKeyRelations,
          schema,
          table: updatedTable.name,
        });
      }

      if (onSubmit) {
        await onSubmit();
      }

      if (originalTable.table_name !== updatedTable.name) {
        await router.push(
          `/${router.query.workspaceSlug}/${router.query.appSlug}/database/browser/${router.query.dataSourceSlug}/${schema}/${updatedTable.name}`,
        );
      }

      triggerToast('The table has been updated successfully.');
    } catch {
      // Errors are already handled by hooks.
    }
  }

  if (columnsStatus === 'loading') {
    return (
      <div className="px-6">
        <ActivityIndicator label="Loading columns..." delay={1000} />
      </div>
    );
  }

  if (columnsStatus === 'error') {
    return (
      <div className="-mt-3 px-6">
        <Alert severity="error" className="text-left">
          <strong>Error:</strong>{' '}
          {columnsError && columnsError instanceof Error
            ? columnsError?.message
            : 'An error occurred while loading the columns. Please try again.'}
        </Alert>
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      {error && error instanceof Error && (
        <div className="-mt-3 mb-4 px-6">
          <Alert
            severity="error"
            className="grid grid-flow-col items-center justify-between px-4 py-3"
          >
            <span className="text-left">
              <strong>Error:</strong> {error.message}
            </span>

            <Button
              variant="borderless"
              color="error"
              size="small"
              onClick={resetError}
            >
              Clear
            </Button>
          </Alert>
        </div>
      )}

      <BaseTableForm
        submitButtonText="Save"
        onSubmit={handleSubmit}
        {...props}
      />
    </FormProvider>
  );
}
