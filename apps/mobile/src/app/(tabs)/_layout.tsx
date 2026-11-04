import { useRouter } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';

import { t } from '@/i18n/es-CL';
import { IdentifyIcon, JournalIcon, MapIcon, NavigationBar, NavigationItem, ProfileIcon, SpeciesIcon } from '@/ui';

// Mismo orden que los TabTrigger: el deslizamiento sobre la barra navega por índice.
const TAB_HREFS = ['/identify', '/atlas', '/species', '/journal', '/profile'] as const;

// Las pestañas inactivas conservan su estado: el mapa no se recarga al volver a él.
export default function TabsLayout() {
  const router = useRouter();
  return (
    <Tabs activityEnabled style={{ flex: 1 }}>
      {/* minHeight 0: en web un ítem flex no se encoge bajo su contenido y empujaría la barra fuera de la pantalla. */}
      <TabSlot style={{ flex: 1, minHeight: 0 }} />
      <TabList asChild>
        <NavigationBar onScrubEnd={(index) => router.navigate(TAB_HREFS[index])}>
          <TabTrigger name="identify" href="/identify" asChild>
            <NavigationItem label={t.tabs.identify} icon={IdentifyIcon} />
          </TabTrigger>
          <TabTrigger name="atlas" href="/atlas" asChild>
            <NavigationItem label={t.tabs.map} icon={MapIcon} />
          </TabTrigger>
          <TabTrigger name="species" href="/species" asChild>
            <NavigationItem label={t.tabs.species} icon={SpeciesIcon} />
          </TabTrigger>
          <TabTrigger name="journal" href="/journal" asChild>
            <NavigationItem label={t.tabs.journal} icon={JournalIcon} />
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <NavigationItem label={t.tabs.profile} icon={ProfileIcon} />
          </TabTrigger>
        </NavigationBar>
      </TabList>
    </Tabs>
  );
}
