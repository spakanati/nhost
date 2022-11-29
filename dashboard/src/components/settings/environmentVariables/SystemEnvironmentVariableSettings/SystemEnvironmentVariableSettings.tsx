import { useDialog } from '@/components/common/DialogProvider';
import InlineCode from '@/components/common/InlineCode';
import SettingsContainer from '@/components/settings/SettingsContainer';
import { useCurrentWorkspaceAndApplication } from '@/hooks/useCurrentWorkspaceAndApplication';
import ActivityIndicator from '@/ui/v2/ActivityIndicator';
import Button from '@/ui/v2/Button';
import Divider from '@/ui/v2/Divider';
import IconButton from '@/ui/v2/IconButton';
import EyeIcon from '@/ui/v2/icons/EyeIcon';
import EyeOffIcon from '@/ui/v2/icons/EyeOffIcon';
import Input from '@/ui/v2/Input';
import List from '@/ui/v2/List';
import { ListItem } from '@/ui/v2/ListItem';
import Text from '@/ui/v2/Text';
import { useGetAppInjectedVariablesQuery } from '@/utils/__generated__/graphql';
import { useState } from 'react';

export default function SystemEnvironmentVariableSettings() {
  const [showAdminSecret, setShowAdminSecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const { openAlertDialog } = useDialog();
  const { currentApplication } = useCurrentWorkspaceAndApplication();
  const { data, loading, error } = useGetAppInjectedVariablesQuery({
    variables: { id: currentApplication?.id },
  });

  if (loading) {
    return (
      <ActivityIndicator
        delay={1000}
        label="Loading system environment variables..."
      />
    );
  }

  if (error) {
    throw error;
  }

  function showJwtSecret() {
    openAlertDialog({
      title: 'Auth JWT Secret',
      payload: (
        <div className="grid grid-flow-row gap-2">
          <Text variant="subtitle2">
            This is the key used for generating JWTs. It&apos;s HMAC-SHA-based
            and the same as configured in Hasura.
          </Text>

          <Input
            defaultValue={data?.app?.hasuraGraphqlJwtSecret}
            disabled
            fullWidth
            multiline
            minRows={5}
            hideEmptyHelperText
            inputProps={{ className: 'font-mono' }}
          />
        </div>
      ),
      props: {
        hidePrimaryAction: true,
        secondaryButtonText: 'Close',
      },
    });
  }

  return (
    <SettingsContainer
      title="System Environment Variables"
      description="Environment Variables are key-value pairs configured outside your source code. They are used to store environment-specific values such as API keys."
      docsLink="https://docs.nhost.io/platform/environment-variables#system-environment-variables"
      rootClassName="gap-0"
      className="px-0 mt-2 mb-2.5"
      slotProps={{ submitButton: { className: 'invisible' } }}
    >
      <div className="grid grid-cols-2 border-b-1 border-gray-200 px-4 py-3">
        <Text className="font-medium">Variable Name</Text>
        <Text className="font-medium">Value</Text>
      </div>

      <List>
        <ListItem.Root className="px-4 grid grid-cols-2">
          <ListItem.Text>NHOST_ADMIN_SECRET</ListItem.Text>

          <div className="grid grid-flow-col gap-2 items-center justify-start">
            <Text className="text-greyscaleGreyDark">
              {showAdminSecret ? (
                <InlineCode className="!text-sm font-medium max-h-[initial] h-[initial]">
                  {currentApplication?.hasuraGraphqlAdminSecret}
                </InlineCode>
              ) : (
                '●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●'
              )}
            </Text>

            <IconButton
              variant="borderless"
              color="secondary"
              aria-label={
                showAdminSecret ? 'Hide Admin Secret' : 'Show Admin Secret'
              }
              onClick={() => setShowAdminSecret((show) => !show)}
            >
              {showAdminSecret ? (
                <EyeOffIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </IconButton>
          </div>
        </ListItem.Root>

        <Divider component="li" className="!my-4" />

        <ListItem.Root className="px-4 grid grid-cols-2">
          <ListItem.Text>NHOST_WEBHOOK_SECRET</ListItem.Text>

          <div className="grid grid-flow-col gap-2 items-center justify-start">
            <Text className="text-greyscaleGreyDark">
              {showWebhookSecret ? (
                <InlineCode className="!text-sm font-medium max-h-[initial] h-[initial]">
                  {data?.app?.webhookSecret}
                </InlineCode>
              ) : (
                '●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●'
              )}
            </Text>

            <IconButton
              variant="borderless"
              color="secondary"
              aria-label={
                showWebhookSecret
                  ? 'Hide Webhook Secret'
                  : 'Show Webhook Secret'
              }
              onClick={() => setShowWebhookSecret((show) => !show)}
            >
              {showWebhookSecret ? (
                <EyeOffIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </IconButton>
          </div>
        </ListItem.Root>

        <Divider component="li" className="!mt-4 !mb-2.5" />

        <ListItem.Root className="px-4 grid grid-cols-2 justify-start">
          <ListItem.Text>NHOST_JWT_SECRET</ListItem.Text>

          <Button
            variant="borderless"
            onClick={showJwtSecret}
            size="small"
            className="justify-self-start"
          >
            Show JWT Secret
          </Button>
        </ListItem.Root>
      </List>
    </SettingsContainer>
  );
}
