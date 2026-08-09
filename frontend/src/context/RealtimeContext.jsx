import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";

import {
    connectRealtimeEvents
} from "../services/realtime.service";
import {
    useAuth
} from "./AuthContext";

const RealtimeContext =
    createContext(null);

function noRealtimeSubscription() {
    return () => {};
}

const ALL_REALTIME_RESOURCES = [
    "NOTIFICATIONS",
    "RESERVATIONS",
    "ORDERS",
    "COMMANDS",
    "DELIVERIES",
    "CASH",
    "SALES",
    "EXPENSES",
    "REPORTS",
    "INVENTORY",
    "CATALOG",
    "LOYALTY",
    "PROMOTIONS",
    "USERS",
    "ROLES",
    "BRANCHES",
    "SETTINGS",
    "AUDIT",
    "CLAIMS",
    "REVIEWS",
    "BACKUPS"
];

export function RealtimeProvider({
    children
}) {
    const {
        token
    } = useAuth();

    const subscribersRef =
        useRef(new Map());
    const nextSubscriberIdRef =
        useRef(0);

    const [
        status,
        setStatus
    ] = useState("DISCONNECTED");

    const subscribe = useCallback((
        resources,
        listener
    ) => {
        nextSubscriberIdRef.current += 1;

        const id =
            nextSubscriberIdRef.current;

        subscribersRef.current.set(id, {
            resources:
                new Set(resources),
            listener
        });

        return () => {
            subscribersRef.current.delete(id);
        };
    }, []);

    const notifySubscribers =
        useCallback((event) => {
            const changedResources =
                new Set(
                    event.resources
                );

            for (
                const subscriber
                of subscribersRef.current.values()
            ) {
                const isRelevant =
                    [...subscriber.resources]
                        .some(
                            (resource) =>
                                changedResources.has(
                                    resource
                                )
                        );

                if (isRelevant) {
                    try {
                        subscriber.listener(event);
                    } catch (error) {
                        console.error(
                            "No se pudo procesar una actualización en tiempo real:",
                            error
                        );
                    }
                }
            }
        }, []);

    const handleStatusChange =
        useCallback((nextStatus) => {
            setStatus(nextStatus);

            if (nextStatus === "CONNECTED") {
                notifySubscribers({
                    id: `sync-${Date.now()}`,
                    type: "DATA_CHANGED",
                    resources:
                        ALL_REALTIME_RESOURCES,
                    createdAt:
                        new Date()
                            .toISOString()
                });
            }
        }, [notifySubscribers]);

    useEffect(() => {
        if (!token) {
            return undefined;
        }

        return connectRealtimeEvents({
            onChange:
                notifySubscribers,
            onStatusChange:
                handleStatusChange
        });
    }, [
        token,
        notifySubscribers,
        handleStatusChange
    ]);

    const value = useMemo(
        () => ({
            status,
            subscribe
        }),
        [
            status,
            subscribe
        ]
    );

    return (
        <RealtimeContext.Provider value={value}>
            {children}
        </RealtimeContext.Provider>
    );
}

// Estos hooks comparten el archivo con el proveedor de forma intencional.
// eslint-disable-next-line react-refresh/only-export-components
export function useRealtime() {
    const context =
        useContext(
            RealtimeContext
        );

    if (!context) {
        throw new Error(
            "useRealtime debe utilizarse dentro de RealtimeProvider."
        );
    }

    return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRealtimeVersion(
    resources,
    debounceMs = 120
) {
    const context =
        useContext(
            RealtimeContext
        );

    const subscribe =
        context?.subscribe ??
        noRealtimeSubscription;

    const [
        version,
        setVersion
    ] = useState(0);

    const resourceKey =
        [...new Set(resources)]
            .sort()
            .join("|");

    useEffect(() => {
        let timeoutId;

        const unsubscribe =
            subscribe(
                resourceKey
                    .split("|")
                    .filter(Boolean),
                () => {
                    window.clearTimeout(
                        timeoutId
                    );

                    timeoutId =
                        window.setTimeout(
                            () => {
                                setVersion(
                                    (current) =>
                                        current + 1
                                );
                            },
                            debounceMs
                        );
                }
            );

        return () => {
            window.clearTimeout(
                timeoutId
            );
            unsubscribe();
        };
    }, [
        debounceMs,
        resourceKey,
        subscribe
    ]);

    return version;
}
