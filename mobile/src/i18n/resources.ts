// i18n resource map — French (fr) and English (en)

export const resources = {
  fr: {
    translation: {
      // Common
      common: {
        ok:        'OK',
        cancel:    'Annuler',
        confirm:   'Confirmer',
        save:      'Enregistrer',
        delete:    'Supprimer',
        edit:      'Modifier',
        back:      'Retour',
        next:      'Suivant',
        loading:   'Chargement...',
        error:     'Une erreur est survenue',
        retry:     'Réessayer',
        search:    'Rechercher',
        filter:    'Filtrer',
        seeAll:    'Voir tout',
        noResults: 'Aucun résultat',
      },

      // Auth
      auth: {
        login:           'Connexion',
        register:        'Inscription',
        logout:          'Déconnexion',
        email:           'Adresse e-mail',
        password:        'Mot de passe',
        phone:           'Numéro de téléphone',
        firstName:       'Prénom',
        lastName:        'Nom',
        forgotPassword:  'Mot de passe oublié ?',
        resetPassword:   'Réinitialiser le mot de passe',
        verifyPhone:     'Vérification du téléphone',
        otpSent:         'Code envoyé par SMS',
        enterOtp:        'Entrez le code reçu',
        resendOtp:       'Renvoyer le code',
        totpTitle:       'Authentification à deux facteurs',
        totpPlaceholder: 'Code TOTP',
        noAccount:       'Pas encore de compte ?',
        hasAccount:      'Déjà un compte ?',
      },

      // Properties
      property: {
        title:          'Logements',
        search:         'Rechercher un logement',
        checkIn:        'Arrivée',
        checkOut:       'Départ',
        guests:         'Voyageurs',
        pricePerNight:  'par nuit',
        rating:         'Note',
        reviews:        'avis',
        amenities:      'Équipements',
        description:    'Description',
        location:       'Localisation',
        boosted:        'Mis en avant',
        noProperties:   'Aucun logement disponible',
        addProperty:    'Ajouter un logement',
      },

      // Bookings
      booking: {
        title:         'Réservations',
        create:        'Réserver',
        confirm:       'Confirmer la réservation',
        cancel:        'Annuler la réservation',
        myBookings:    'Mes réservations',
        status: {
          pending:   'En attente',
          confirmed: 'Confirmée',
          cancelled: 'Annulée',
          completed: 'Terminée',
          disputed:  'Litige',
        },
        nights:        'nuit(s)',
        totalPrice:    'Prix total',
        amountDue:     'Reste à payer',
      },

      // Messages
      message: {
        title:       'Messages',
        placeholder: 'Écrire un message...',
        send:        'Envoyer',
        noMessages:  'Aucun message',
      },

      // Profile
      profile: {
        title:          'Profil',
        editProfile:    'Modifier le profil',
        settings:       'Paramètres',
        language:       'Langue',
        currency:       'Devise',
        notifications:  'Notifications',
        support:        'Support',
        referral:       'Parrainage',
        subscription:   'Abonnement',
        deleteAccount:  'Supprimer le compte',
      },

      // Errors
      error: {
        network:      'Erreur réseau. Vérifiez votre connexion.',
        unauthorized: 'Session expirée. Veuillez vous reconnecter.',
        notFound:     'Ressource introuvable.',
        server:       'Erreur serveur. Réessayez plus tard.',
        validation:   'Données invalides.',
      },
    },
  },

  en: {
    translation: {
      common: {
        ok:        'OK',
        cancel:    'Cancel',
        confirm:   'Confirm',
        save:      'Save',
        delete:    'Delete',
        edit:      'Edit',
        back:      'Back',
        next:      'Next',
        loading:   'Loading...',
        error:     'An error occurred',
        retry:     'Retry',
        search:    'Search',
        filter:    'Filter',
        seeAll:    'See all',
        noResults: 'No results',
      },

      auth: {
        login:           'Log in',
        register:        'Sign up',
        logout:          'Log out',
        email:           'Email address',
        password:        'Password',
        phone:           'Phone number',
        firstName:       'First name',
        lastName:        'Last name',
        forgotPassword:  'Forgot password?',
        resetPassword:   'Reset password',
        verifyPhone:     'Phone verification',
        otpSent:         'Code sent by SMS',
        enterOtp:        'Enter the code you received',
        resendOtp:       'Resend code',
        totpTitle:       'Two-factor authentication',
        totpPlaceholder: 'TOTP code',
        noAccount:       'No account yet?',
        hasAccount:      'Already have an account?',
      },

      property: {
        title:          'Properties',
        search:         'Search for a property',
        checkIn:        'Check-in',
        checkOut:       'Check-out',
        guests:         'Guests',
        pricePerNight:  'per night',
        rating:         'Rating',
        reviews:        'reviews',
        amenities:      'Amenities',
        description:    'Description',
        location:       'Location',
        boosted:        'Featured',
        noProperties:   'No properties available',
        addProperty:    'Add a property',
      },

      booking: {
        title:         'Bookings',
        create:        'Book now',
        confirm:       'Confirm booking',
        cancel:        'Cancel booking',
        myBookings:    'My bookings',
        status: {
          pending:   'Pending',
          confirmed: 'Confirmed',
          cancelled: 'Cancelled',
          completed: 'Completed',
          disputed:  'Disputed',
        },
        nights:        'night(s)',
        totalPrice:    'Total price',
        amountDue:     'Amount due',
      },

      message: {
        title:       'Messages',
        placeholder: 'Write a message...',
        send:        'Send',
        noMessages:  'No messages',
      },

      profile: {
        title:          'Profile',
        editProfile:    'Edit profile',
        settings:       'Settings',
        language:       'Language',
        currency:       'Currency',
        notifications:  'Notifications',
        support:        'Support',
        referral:       'Referral',
        subscription:   'Subscription',
        deleteAccount:  'Delete account',
      },

      error: {
        network:      'Network error. Check your connection.',
        unauthorized: 'Session expired. Please log in again.',
        notFound:     'Resource not found.',
        server:       'Server error. Please try again later.',
        validation:   'Invalid data.',
      },
    },
  },
} as const;
