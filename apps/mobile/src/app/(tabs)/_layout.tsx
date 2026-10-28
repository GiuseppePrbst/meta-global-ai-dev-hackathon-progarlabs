import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';

import { t } from '@/i18n/es-CL';
import { AtlasIcon, IdentifyIcon, NavigationBar, NavigationItem, ObservationsIcon, SpeciesIcon } from '@/ui';

// Las pestañas inactivas conservan su estado: el mapa no se recarga al volver al Atlas.
export default function TabsLayout() {
  return (
    <Tabs activityEnabled style={{ flex: 1 }}>
      <TabSlot />
      <TabList asChild>
        <NavigationBar>
          <TabTrigger name="identify" href="/identify" asChild>
            <NavigationItem label={t.tabs.identify} icon={IdentifyIcon} />
          </TabTrigger>
          <TabTrigger name="atlas" href="/atlas" asChild>
            <NavigationItem label={t.tabs.atlas} icon={AtlasIcon} />
          </TabTrigger>
          <TabTrigger name="species" href="/species" asChild>
            <NavigationItem label={t.tabs.species} icon={SpeciesIcon} />
          </TabTrigger>
          <TabTrigger name="observations" href="/observations" asChild>
            <NavigationItem label={t.tabs.observations} icon={ObservationsIcon} />
          </TabTrigger>
        </NavigationBar>
      </TabList>
    </Tabs>
  );
}
