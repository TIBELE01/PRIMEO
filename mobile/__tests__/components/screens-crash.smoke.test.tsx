// Smoke tests "anti-crash" — on monte les écrans réputés fragiles avec des
// données HOSTILES (champs undefined / null / vides, statuts inconnus, réponses
// API non conformes) et on vérifie qu'AUCUN ne lève d'erreur au rendu.
//
// Ces écrans sont ceux qui plantaient sur l'onglet Messages / Restaurant :
// l'accès direct `value.toLocaleString()` ou `str[0]` sur une valeur undefined
// renvoie en Hermes « Cannot convert undefined value to object ».
//
// Si un renderItem lève, React propage l'erreur et `render()` throw → test rouge.

import React from 'react';
import { render, waitFor, configure, fireEvent } from '@testing-library/react-native';

// Démarrage à froid de la suite : laisse aux requêtes async le temps de résoudre.
configure({ asyncUtilTimeout: 5000 });

// ── Mocks transverses ─────────────────────────────────────────────────────────

// SafeAreaView → simple View ; pas besoin de SafeAreaProvider dans les tests.
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...p }: any) => <View {...p}>{children}</View>,
    SafeAreaProvider: ({ children }: any) => <View>{children}</View>,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// useFocusEffect → exécute le callback une fois au montage (comme un focus réel).
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useFocusEffect: (cb: () => undefined | (() => void)) =>
      React.useEffect(() => cb(), []),
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
    useRoute: () => ({ params: {} }),
    useIsFocused: () => true,
  };
});

// Socket : aucune connexion réseau réelle.
jest.mock('@/services/socket/socketService', () => ({
  socketService: {
    connect: jest.fn(() => Promise.resolve()),
    joinRoom: jest.fn(),
    getSocket: jest.fn(() => null),
    markRead: jest.fn(),
    sendTyping: jest.fn(),
    sendMessage: jest.fn(),
  },
}));

// Auth : utilisateur fixe.
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'client' } }),
}));

// APIs mockées (valeurs définies par test).
jest.mock('@/services/api/endpoints/messages', () => ({
  messagesApi: {
    listConversations: jest.fn(),
    getConversation: jest.fn(),
    listTemplates: jest.fn(() => Promise.resolve({ data: { data: [] } })),
    markAsRead: jest.fn(() => Promise.resolve({})),
  },
}));

jest.mock('@/services/api/endpoints/foodOrdersApi', () => ({
  foodOrdersApi: {
    getMyOrders: jest.fn(),
    getById: jest.fn(),
    cancelOrder: jest.fn(),
  },
}));

import { ConversationsScreen } from '@/screens/client/Messaging/ConversationsScreen';
import { ChatScreen } from '@/screens/client/Messaging/ChatScreen';
import MyRestaurantOrdersScreen from '@/screens/client/Restaurant/MyRestaurantOrdersScreen';
import RestaurantOrderTrackingScreen from '@/screens/client/Restaurant/RestaurantOrderTrackingScreen';

import { messagesApi } from '@/services/api/endpoints/messages';
import { foodOrdersApi } from '@/services/api/endpoints/foodOrdersApi';
import { useAuthStore } from '@/store/authStore';

const nav: any = { navigate: jest.fn(), goBack: jest.fn() };

afterEach(() => jest.clearAllMocks());

// ── ConversationsScreen (l'onglet Messages signalé) ────────────────────────────

describe('ConversationsScreen — anti-crash', () => {
  it('rend des conversations sans recipientName / unreadCount / bookingId sans planter', async () => {
    (messagesApi.listConversations as jest.Mock).mockResolvedValue({
      data: {
        data: [
          // recipientName ABSENT — c'était la cause exacte du crash
          { bookingId: 'b1', bookingStatus: 'confirmed', unreadCount: 3, propertyTitle: 'Villa A' },
          // nom vide + unreadCount undefined
          { bookingId: 'b2', recipientName: '', unreadCount: undefined, propertyTitle: 'Villa B' },
          // bookingId ABSENT + nom null (teste keyExtractor + avatar)
          { recipientName: null, unreadCount: null, propertyTitle: 'Villa C' },
          // cas nominal avec avatar
          { bookingId: 'b4', recipientName: 'Alice', unreadCount: 2, recipientAvatarUrl: 'http://x/a.jpg' },
        ],
      },
    });

    const { findByText } = render(<ConversationsScreen navigation={nav} route={{ params: undefined } as any} />);
    // Si le rendu d'un item avait planté, ceci n'aboutirait jamais.
    expect(await findByText('Alice')).toBeTruthy();
  });

  it('survit quand lastMessage / recipientName / propertyTitle arrivent en OBJET (pas une string)', async () => {
    // Reproduit exactement « Objects are not valid as a React child
    // (found: object with keys {id, content, sentAt, senderId, isRead}) ».
    (messagesApi.listConversations as jest.Mock).mockResolvedValue({
      data: {
        data: [
          {
            bookingId: 'b1',
            // le backend renvoie l'objet message complet au lieu du texte
            lastMessage: { id: 'm1', content: 'Dernier message', sentAt: '2024-01-01T10:00:00Z', senderId: 'u2', isRead: false },
            recipientName: { id: 'u2', firstName: 'Bob' }, // objet au lieu d'une string
            propertyTitle: { id: 'p1', title: 'Villa Objet' }, // objet au lieu d'une string
            unreadCount: 1,
          },
        ],
      },
    });
    const { findByText } = render(<ConversationsScreen navigation={nav} route={{ params: undefined } as any} />);
    // .content de l'objet message est extrait et rendu comme texte, sans crash.
    expect(await findByText('Dernier message')).toBeTruthy();
  });

  it('forme backend déployé (id + otherParticipant + lastMessage objet) : résout le nom ET navigue avec bookingId', async () => {
    // Reproduit la forme réelle qui causait avatars « ? » + « Conversation introuvable ».
    (messagesApi.listConversations as jest.Mock).mockResolvedValue({
      data: {
        data: [
          {
            id: 'bk1', // bookingId nommé "id"
            status: 'confirmed',
            otherParticipant: { firstName: 'Koffi', lastName: 'Yeo', avatarUrl: null },
            property: { title: 'Appartement Plateau' },
            lastMessage: { id: 'm1', content: 'Bonjour monsieur', sentAt: '2024-01-01T10:00:00Z', senderId: 'u2', isRead: false },
            unreadCount: 2,
          },
        ],
      },
    });

    const navSpy: any = { navigate: jest.fn(), goBack: jest.fn() };
    const { findByText, getByText } = render(<ConversationsScreen navigation={navSpy} route={{ params: undefined } as any} />);

    // Nom résolu depuis otherParticipant (plus de « ? »)
    expect(await findByText('Koffi Yeo')).toBeTruthy();
    // Aperçu extrait de l'objet message
    expect(getByText('Bonjour monsieur')).toBeTruthy();
    // Titre du bien affiché
    expect(getByText(/Appartement Plateau/)).toBeTruthy();

    // Au clic : navigation vers Chat avec un bookingId valide (résolu depuis "id")
    fireEvent.press(getByText('Koffi Yeo'));
    expect(navSpy.navigate).toHaveBeenCalledWith('Chat', { bookingId: 'bk1', recipientName: 'Koffi Yeo' });
  });

  it('forme booking brute (client + owner) : affiche l\'autre partie selon le rôle', async () => {
    useAuthStore.setState({ user: { id: 'client-1', role: 'client' } as any });
    (messagesApi.listConversations as jest.Mock).mockResolvedValue({
      data: {
        data: [
          {
            id: 'bk9', status: 'confirmed',
            client: { id: 'client-1', firstName: 'TIBELE', lastName: 'YEO' },
            owner: { id: 'owner-1', firstName: 'Koffi', lastName: 'Yeo', avatarUrl: null },
            property: { title: 'Villa X' },
            messages: [{ id: 'm', content: 'Salut', sentAt: '2024-01-01T10:00:00Z' }],
            unreadCount: 0,
          },
        ],
      },
    });
    const { findByText, queryByText } = render(<ConversationsScreen navigation={nav} route={{ params: undefined } as any} />);
    expect(await findByText('Koffi Yeo')).toBeTruthy();      // le propriétaire (autre partie)
    expect(queryByText('TIBELE YEO')).toBeNull();            // pas soi-même
    useAuthStore.setState({ user: null } as any);
  });

  it('survit à une réponse API non conforme (data null)', async () => {
    (messagesApi.listConversations as jest.Mock).mockResolvedValue({ data: { data: null } });
    const { findByText } = render(<ConversationsScreen navigation={nav} route={{ params: undefined } as any} />);
    expect(await findByText('Aucune conversation')).toBeTruthy();
  });

  it('survit à un rejet API', async () => {
    (messagesApi.listConversations as jest.Mock).mockRejectedValue(new Error('network'));
    const { findByText } = render(<ConversationsScreen navigation={nav} route={{ params: undefined } as any} />);
    expect(await findByText('Aucune conversation')).toBeTruthy();
  });
});

// ── ChatScreen ─────────────────────────────────────────────────────────────────

describe('ChatScreen — anti-crash', () => {
  it('rend des messages hostiles (id/content/createdAt undefined) sans planter', async () => {
    (messagesApi.getConversation as jest.Mock).mockResolvedValue({
      data: {
        messages: [
          { id: 'm1', content: 'Bonjour', createdAt: '2024-01-01T10:00:00Z', senderId: 'u1', isRead: true },
          // message hostile : tout undefined/null
          { id: undefined, content: null, createdAt: undefined, senderId: undefined, isRead: undefined },
          // content en OBJET (ne doit pas planter — content.startsWith protégé)
          { id: 'm4', content: { weird: true }, createdAt: '2024-01-01T11:00:00Z', senderId: 'u2' },
          // image + date invalide
          { id: 'm3', content: '[Image] http://x/i.jpg', createdAt: 'pas-une-date', senderId: 'u2' },
        ],
      },
    });

    // recipientName fourni en OBJET (route malformée) → header doit retomber sur "Discussion".
    const { findByText } = render(
      <ChatScreen navigation={nav} route={{ params: { bookingId: 'b1', recipientName: { id: 'u2' } } } as any} />,
    );
    expect(await findByText('Bonjour')).toBeTruthy();
    expect(await findByText('Discussion')).toBeTruthy();
  });

  it('affiche un écran de repli (pas un crash) quand bookingId manque', async () => {
    const { findByText } = render(
      <ChatScreen navigation={nav} route={{ params: undefined } as any} />,
    );
    expect(await findByText(/Conversation introuvable/)).toBeTruthy();
  });
});

// ── MyRestaurantOrdersScreen ───────────────────────────────────────────────────

describe('MyRestaurantOrdersScreen — anti-crash', () => {
  it('rend des commandes avec id/total/items/status manquants sans planter', async () => {
    (foodOrdersApi.getMyOrders as jest.Mock).mockResolvedValue({
      data: {
        data: [
          { id: 'o1', status: 'pending', totalAmount: 5000, orderedAt: '2024-01-01T12:00:00Z',
            items: [{ quantity: 2, menuItem: { name: 'Pizza' } }] },
          // hostile : id/total/items/status absents
          { status: 'statut_inconnu', orderedAt: undefined },
        ],
      },
    });

    const { findByText } = render(<MyRestaurantOrdersScreen navigation={nav} route={{ params: {} } as any} />);
    expect(await findByText(/Pizza/)).toBeTruthy();
  });

  it('survit à une réponse API non conforme', async () => {
    (foodOrdersApi.getMyOrders as jest.Mock).mockResolvedValue({ data: { data: undefined } });
    const r = render(<MyRestaurantOrdersScreen navigation={nav} route={{ params: {} } as any} />);
    await waitFor(() => expect(foodOrdersApi.getMyOrders).toHaveBeenCalled());
    expect(r.toJSON()).toBeTruthy(); // pas de throw
  });
});

// ── RestaurantOrderTrackingScreen ──────────────────────────────────────────────

describe('RestaurantOrderTrackingScreen — anti-crash', () => {
  it('rend une commande nominale sans planter', async () => {
    (foodOrdersApi.getById as jest.Mock).mockResolvedValue({
      data: {
        data: {
          id: 'o1', status: 'preparing', totalAmount: 3000, estimatedMinutes: 15,
          items: [{ id: 'i1', quantity: 1, menuItem: { name: 'Burger' }, totalPrice: 3000 }],
        },
      },
    });
    const { findByText } = render(
      <RestaurantOrderTrackingScreen navigation={nav} route={{ params: { orderId: 'o1' } } as any} />,
    );
    expect(await findByText(/Burger/)).toBeTruthy();
  });

  it('rend une commande HOSTILE (status inconnu, total/items/id absents) sans planter', async () => {
    (foodOrdersApi.getById as jest.Mock).mockResolvedValue({
      data: { data: { status: 'statut_bidon' } }, // id, totalAmount, items absents
    });
    const { findByText } = render(
      <RestaurantOrderTrackingScreen navigation={nav} route={{ params: { orderId: 'o1' } } as any} />,
    );
    // Le total se rend en "0 FCFA" grâce au repli — l'écran ne plante pas.
    expect(await findByText(/FCFA/)).toBeTruthy();
  });
});
