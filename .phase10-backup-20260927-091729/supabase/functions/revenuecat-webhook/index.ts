import {
  createClient,
} from 'npm:@supabase/supabase-js@2';

type JsonObject = {
  [key: string]: unknown;
};

const encoder =
  new TextEncoder();

function jsonResponse(
  body: unknown,
  status = 200,
): Response {
  return new Response(
    JSON.stringify(
      body,
    ),
    {
      status,

      headers: {
        'Content-Type':
          'application/json',
      },
    },
  );
}

function defaultKeyFromJson(
  envName: string,
): string | null {
  const raw =
    Deno.env.get(
      envName,
    );

  if (!raw) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(
        raw,
      ) as Record<
        string,
        unknown
      >;

    const value =
      parsed.default;

    return typeof value ===
      'string'
      ? value
      : null;
  } catch {
    return null;
  }
}

function getRequiredEnv(
  name: string,
): string {
  const value =
    Deno.env.get(
      name,
    );

  if (!value) {
    throw new Error(
      `Missing server configuration: ${name}`,
    );
  }

  return value;
}

function getSupabaseSecretKey():
  string {
  return (
    Deno.env.get(
      'SUPABASE_SERVICE_ROLE_KEY',
    )
    ??
    defaultKeyFromJson(
      'SUPABASE_SECRET_KEYS',
    )
    ??
    (() => {
      throw new Error(
        'Missing Supabase secret key.',
      );
    })()
  );
}

function secureEqual(
  left: string,
  right: string,
): boolean {
  const leftBytes =
    encoder.encode(
      left,
    );

  const rightBytes =
    encoder.encode(
      right,
    );

  if (
    leftBytes.length
    !== rightBytes.length
  ) {
    return false;
  }

  let difference =
    0;

  for (
    let index = 0;
    index < leftBytes.length;
    index += 1
  ) {
    difference |=
      leftBytes[index]
      ^ rightBytes[index];
  }

  return difference === 0;
}

function hex(
  bytes:
    ArrayBuffer,
): string {
  return Array
    .from(
      new Uint8Array(
        bytes,
      ),
    )
    .map(
      (value) =>
        value
          .toString(16)
          .padStart(
            2,
            '0',
          ),
    )
    .join('');
}

async function verifyHmac(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  const parts =
    signatureHeader
      .split(',')
      .map(
        (part) =>
          part.trim(),
      );

  const timestampPart =
    parts.find(
      (part) =>
        part.startsWith(
          't=',
        ),
    );

  const signaturePart =
    parts.find(
      (part) =>
        part.startsWith(
          'v1=',
        ),
    );

  if (
    !timestampPart
    ||
    !signaturePart
  ) {
    return false;
  }

  const timestamp =
    Number(
      timestampPart.slice(
        2,
      ),
    );

  const suppliedSignature =
    signaturePart.slice(
      3,
    );

  if (
    !Number.isSafeInteger(
      timestamp,
    )
    ||
    !/^[0-9a-f]{64}$/i.test(
      suppliedSignature,
    )
  ) {
    return false;
  }

  const nowSeconds =
    Math.floor(
      Date.now()
      / 1000,
    );

  if (
    Math.abs(
      nowSeconds
      - timestamp,
    )
    > 300
  ) {
    return false;
  }

  const key =
    await crypto.subtle
      .importKey(
        'raw',
        encoder.encode(
          secret,
        ),
        {
          name:
            'HMAC',

          hash:
            'SHA-256',
        },
        false,
        [
          'sign',
        ],
      );

  const signature =
    await crypto.subtle
      .sign(
        'HMAC',
        key,
        encoder.encode(
          `${timestamp}.${rawBody}`,
        ),
      );

  return secureEqual(
    hex(
      signature,
    ),
    suppliedSignature
      .toLowerCase(),
  );
}

function stringOrNull(
  value: unknown,
): string | null {
  return typeof value ===
    'string'
    &&
    value.trim()
    ? value
    : null;
}

function stringArray(
  value: unknown,
): string[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value
    .filter(
      (
        item,
      ): item is string =>
        typeof item ===
          'string'
        &&
        item.trim()
          .length > 0,
    );
}

function uuidOrNull(
  value: string | null,
): string | null {
  if (!value) {
    return null;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(
      value,
    )
    ? value
    : null;
}

function candidateUserId(
  event:
    JsonObject,
): string | null {
  const candidates = [
    stringOrNull(
      event.app_user_id,
    ),
    stringOrNull(
      event.original_app_user_id,
    ),
    ...stringArray(
      event.aliases,
    ),
  ];

  for (
    const candidate
    of candidates
  ) {
    const uuid =
      uuidOrNull(
        candidate,
      );

    if (uuid) {
      return uuid;
    }
  }

  return null;
}

function timestampOrNull(
  value: unknown,
): string | null {
  if (
    typeof value !==
      'number'
    ||
    !Number.isFinite(
      value,
    )
  ) {
    return null;
  }

  const date =
    new Date(
      value,
    );

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date.toISOString();
}

function objectOrNull(
  value: unknown,
): JsonObject | null {
  return (
    value
    && typeof value ===
      'object'
    && !Array.isArray(
      value,
    )
  )
    ? value as JsonObject
    : null;
}

function isoStringOrNull(
  value: unknown,
): string | null {
  const text =
    stringOrNull(
      value,
    );

  if (!text) {
    return null;
  }

  const date =
    new Date(
      text,
    );

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date.toISOString();
}

function upperStringOrNull(
  value: unknown,
): string | null {
  const text =
    stringOrNull(
      value,
    );

  return text
    ? text.toUpperCase()
    : null;
}

function laterDate(
  first: string | null,
  second: string | null,
): string | null {
  if (!first) {
    return second;
  }

  if (!second) {
    return first;
  }

  return new Date(
    first,
  ).getTime()
    >= new Date(
      second,
    ).getTime()
    ? first
    : second;
}

type PremiumReconciliationSnapshot = {
  isActive: boolean;
  productId: string | null;
  store: string | null;
  periodType: string | null;
  expirationAt: string | null;
  willRenew: boolean | null;
};

function premiumSnapshotFromCustomer(
  payload: JsonObject,
  event: JsonObject,
): PremiumReconciliationSnapshot {
  const subscriber =
    objectOrNull(
      payload.subscriber,
    );

  if (!subscriber) {
    throw new Error(
      'RevenueCat customer response is missing subscriber data.',
    );
  }

  const entitlements =
    objectOrNull(
      subscriber.entitlements,
    );

  const premium =
    entitlements
      ? objectOrNull(
          entitlements.premium,
        )
      : null;

  if (!premium) {
    return {
      isActive:
        false,
      productId:
        null,
      store:
        upperStringOrNull(
          event.store,
        ),
      periodType:
        null,
      expirationAt:
        null,
      willRenew:
        null,
    };
  }

  const expirationAt =
    laterDate(
      isoStringOrNull(
        premium.expires_date,
      ),
      isoStringOrNull(
        premium.grace_period_expires_date,
      ),
    );

  const productId =
    stringOrNull(
      premium.product_identifier,
    );

  const subscriptions =
    objectOrNull(
      subscriber.subscriptions,
    );

  const subscription =
    productId
    && subscriptions
      ? objectOrNull(
          subscriptions[
            productId
          ],
        )
      : null;

  const periodType =
    upperStringOrNull(
      subscription
        ?.period_type,
    );

  const store =
    upperStringOrNull(
      subscription
        ?.store,
    )
    ?? upperStringOrNull(
      event.store,
    );

  const unsubscribeDetectedAt =
    isoStringOrNull(
      subscription
        ?.unsubscribe_detected_at,
    );

  const isActive =
    expirationAt === null
    || new Date(
      expirationAt,
    ).getTime()
      > Date.now();

  const willRenew =
    subscription
      ? periodType ===
          'PREPAID'
        ? false
        : unsubscribeDetectedAt
          ? false
          : isActive
      : null;

  return {
    isActive,
    productId,
    store,
    periodType,
    expirationAt,
    willRenew,
  };
}

async function fetchRevenueCatCustomer(
  appUserId: string,
  secretApiKey: string,
): Promise<JsonObject> {
  const response =
    await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
      {
        method:
          'GET',

        headers: {
          Authorization:
            `Bearer ${secretApiKey}`,

          Accept:
            'application/json',
        },
      },
    );

  if (!response.ok) {
    throw new Error(
      `RevenueCat customer lookup failed with status ${response.status}.`,
    );
  }

  const parsed =
    await response.json();

  const object =
    objectOrNull(
      parsed,
    );

  if (!object) {
    throw new Error(
      'RevenueCat customer lookup returned an invalid response.',
    );
  }

  return object;
}

type TransferRpcClient = {
  rpc: (
    functionName: string,
    args: Record<
      string,
      unknown
    >,
  ) => Promise<{
    data: unknown;
    error: {
      message: string;
    } | null;
  }>;
};

async function reconcileTransferEvent(
  event: JsonObject,
  eventId: string,
  eventTimestamp: string,
  serviceClient: unknown,
): Promise<{
  reconciledUsers: number;
  skippedIdentifiers: number;
  requiresManualReconciliation: boolean;
}> {
  const rawIdentifiers = [
    ...stringArray(
      event.transferred_from,
    ),
    ...stringArray(
      event.transferred_to,
    ),
  ];

  const userIds =
    Array.from(
      new Set(
        rawIdentifiers
          .map(
            (identifier) =>
              uuidOrNull(
                identifier,
              ),
          )
          .filter(
            (
              identifier,
            ): identifier is string =>
              Boolean(
                identifier,
              ),
          ),
      ),
    );

  if (
    userIds.length === 0
  ) {
    console.error(
      'RevenueCat TRANSFER event has no Finance Coach UUID identifiers.',
    );

    return {
      reconciledUsers:
        0,
      skippedIdentifiers:
        rawIdentifiers.length,
      requiresManualReconciliation:
        true,
    };
  }

  const secretApiKey =
    getRequiredEnv(
      'REVENUECAT_SECRET_API_KEY',
    );

  const rpcClient =
    serviceClient as
      TransferRpcClient;

  let reconciledUsers =
    0;

  for (
    const userId
    of userIds
  ) {
    const customer =
      await fetchRevenueCatCustomer(
        userId,
        secretApiKey,
      );

    const snapshot =
      premiumSnapshotFromCustomer(
        customer,
        event,
      );

    const {
      data,
      error,
    } =
      await rpcClient.rpc(
        'reconcile_revenuecat_premium_entitlement',
        {
          p_user_id:
            userId,

          p_is_active:
            snapshot.isActive,

          p_product_id:
            snapshot.productId,

          p_store:
            snapshot.store,

          p_environment:
            upperStringOrNull(
              event.environment,
            ),

          p_period_type:
            snapshot.periodType,

          p_expiration_at:
            snapshot.expirationAt,

          p_will_renew:
            snapshot.willRenew,

          p_source_event_id:
            eventId,

          p_source_event_at:
            eventTimestamp,
        },
      );

    if (error) {
      throw new Error(
        `RevenueCat transfer reconciliation failed: ${error.message}`,
      );
    }

    if (data === true) {
      reconciledUsers += 1;
    }
  }

  return {
    reconciledUsers,
    skippedIdentifiers:
      rawIdentifiers.length
      - userIds.length,
    requiresManualReconciliation:
      rawIdentifiers.length
      !== userIds.length,
  };
}

Deno.serve(
  async (
    request: Request,
  ) => {
    if (
      request.method !==
        'POST'
    ) {
      return jsonResponse(
        {
          error:
            'Method not allowed.',
        },
        405,
      );
    }

    try {
      const expectedAuthorization =
        getRequiredEnv(
          'REVENUECAT_WEBHOOK_AUTHORIZATION',
        );

      const suppliedAuthorization =
        request.headers.get(
          'authorization',
        )
        ?? '';

      if (
        !secureEqual(
          suppliedAuthorization,
          expectedAuthorization,
        )
      ) {
        return jsonResponse(
          {
            error:
              'Unauthorized RevenueCat webhook.',
          },
          401,
        );
      }

      const rawBody =
        await request.text();

      const signingSecret =
        Deno.env.get(
          'REVENUECAT_WEBHOOK_SIGNING_SECRET',
        )
        ?? null;

      if (signingSecret) {
        const signatureHeader =
          request.headers.get(
            'x-revenuecat-webhook-signature',
          );

        if (
          !signatureHeader
          ||
          !await verifyHmac(
            rawBody,
            signatureHeader,
            signingSecret,
          )
        ) {
          return jsonResponse(
            {
              error:
                'Invalid RevenueCat webhook signature.',
            },
            401,
          );
        }
      }

      let payload:
        JsonObject;

      try {
        payload =
          JSON.parse(
            rawBody,
          ) as JsonObject;
      } catch {
        return jsonResponse(
          {
            error:
              'Invalid JSON payload.',
          },
          400,
        );
      }

      if (
        !payload
        ||
        typeof payload !==
          'object'
        ||
        !payload.event
        ||
        typeof payload.event !==
          'object'
      ) {
        return jsonResponse(
          {
            error:
              'Missing RevenueCat event.',
          },
          400,
        );
      }

      const event =
        payload.event as
          JsonObject;

      const eventId =
        stringOrNull(
          event.id,
        );

      const eventType =
        stringOrNull(
          event.type,
        );

      const eventTimestamp =
        timestampOrNull(
          event.event_timestamp_ms,
        );

      if (
        !eventId
        ||
        !eventType
        ||
        !eventTimestamp
      ) {
        return jsonResponse(
          {
            error:
              'RevenueCat event is missing required fields.',
          },
          400,
        );
      }

      const entitlementIds =
        stringArray(
          event.entitlement_ids,
        );

      const deprecatedEntitlement =
        stringOrNull(
          event.entitlement_id,
        );

      if (
        deprecatedEntitlement
        &&
        !entitlementIds.includes(
          deprecatedEntitlement,
        )
      ) {
        entitlementIds.push(
          deprecatedEntitlement,
        );
      }

      const supabaseUrl =
        getRequiredEnv(
          'SUPABASE_URL',
        );

      const serviceClient =
        createClient(
          supabaseUrl,
          getSupabaseSecretKey(),
          {
            auth: {
              persistSession:
                false,

              autoRefreshToken:
                false,
            },
          },
        );

      const {
        data,
        error,
      } =
        await serviceClient
          .rpc(
            'process_revenuecat_webhook_event',
            {
              p_revenuecat_event_id:
                eventId,

              p_event_type:
                eventType,

              p_app_user_id:
                stringOrNull(
                  event.app_user_id,
                ),

              p_user_id:
                candidateUserId(
                  event,
                ),

              p_entitlement_ids:
                entitlementIds,

              p_product_id:
                stringOrNull(
                  event.product_id,
                ),

              p_store:
                stringOrNull(
                  event.store,
                ),

              p_environment:
                stringOrNull(
                  event.environment,
                ),

              p_transaction_id:
                stringOrNull(
                  event.transaction_id,
                ),

              p_original_transaction_id:
                stringOrNull(
                  event.original_transaction_id,
                ),

              p_period_type:
                stringOrNull(
                  event.period_type,
                ),

              p_cancel_reason:
                stringOrNull(
                  event.cancel_reason,
                ),

              p_expiration_reason:
                stringOrNull(
                  event.expiration_reason,
                ),

              p_event_timestamp:
                eventTimestamp,

              p_purchased_at:
                timestampOrNull(
                  event.purchased_at_ms,
                ),

              p_expiration_at:
                timestampOrNull(
                  event.expiration_at_ms,
                ),

              p_payload:
                payload,
            },
          );

      if (error) {
        console.error(
          'RevenueCat webhook database error:',
          error.message,
        );

        return jsonResponse(
          {
            error:
              'Webhook processing failed.',
          },
          500,
        );
      }

      const transferReconciliation =
        eventType ===
          'TRANSFER'
          ? await reconcileTransferEvent(
              event,
              eventId,
              eventTimestamp,
              serviceClient,
            )
          : null;

      return jsonResponse(
        {
          ok:
            true,

          result:
            data,

          transfer_reconciliation:
            transferReconciliation,
        },
      );
    } catch (
      error
    ) {
      console.error(
        'RevenueCat webhook error:',
        error instanceof Error
          ? error.message
          : 'Unknown error',
      );

      return jsonResponse(
        {
          error:
            'Webhook processing failed.',
        },
        500,
      );
    }
  },
);
