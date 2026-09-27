import {
  createClient,
} from 'npm:@supabase/supabase-js@2';


type JsonObject = {
  [key: string]: unknown;
};


type PushTicket = {
  status:
    | 'ok'
    | 'error';

  id?: string;

  message?: string;

  details?: {
    error?: string;
  };
};


const corsHeaders = {
  'Access-Control-Allow-Origin':
    '*',

  'Access-Control-Allow-Headers':
    'content-type, x-notification-dispatch-secret',

  'Access-Control-Allow-Methods':
    'POST, OPTIONS',
};


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
        ...corsHeaders,
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


function ticketArray(
  payload: unknown,
): PushTicket[] {
  if (
    !payload
    ||
    typeof payload !==
      'object'
  ) {
    return [];
  }

  const object =
    payload as JsonObject;

  const data =
    object.data;

  if (
    Array.isArray(
      data,
    )
  ) {
    return data as PushTicket[];
  }

  if (
    data
    &&
    typeof data ===
      'object'
  ) {
    return [
      data as PushTicket,
    ];
  }

  return [];
}


async function sendExpoBatch(
  messages:
    Array<Record<string, unknown>>,
): Promise<PushTicket[]> {
  const response =
    await fetch(
      'https://exp.host/--/api/v2/push/send',
      {
        method:
          'POST',

        headers: {
          'Accept':
            'application/json',

          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify(
            messages,
          ),
      },
    );


  const payload =
    await response.json()
      .catch(
        () => null,
      );


  if (!response.ok) {
    throw new Error(
      `Expo Push Service HTTP ${response.status}`,
    );
  }


  return ticketArray(
    payload,
  );
}


async function checkReceipts(
  serviceClient:
    ReturnType<
      typeof createClient
    >,
): Promise<number> {
  const cutoff =
    new Date(
      Date.now()
      -
      15
      * 60
      * 1000,
    )
      .toISOString();


  const {
    data:
      events,

    error:
      eventsError,
  } =
    await serviceClient
      .from(
        'notification_events',
      )
      .select(
        'id, user_id, device_id, scheduled_notification_id, provider_receipt_id',
      )
      .eq(
        'provider',
        'expo',
      )
      .not(
        'provider_receipt_id',
        'is',
        null,
      )
      .is(
        'receipt_checked_at',
        null,
      )
      .lte(
        'created_at',
        cutoff,
      )
      .limit(
        1000,
      );


  if (eventsError) {
    throw new Error(
      eventsError.message,
    );
  }


  const rows =
    events
    ?? [];


  if (
    rows.length === 0
  ) {
    return 0;
  }


  const ids =
    rows
      .map(
        (event) =>
          event.provider_receipt_id,
      )
      .filter(
        (
          value,
        ): value is string =>
          typeof value ===
            'string',
      );


  if (
    ids.length === 0
  ) {
    return 0;
  }


  let checked =
    0;


  for (
    let start = 0;
    start < ids.length;
    start += 1000
  ) {
    const chunk =
      ids.slice(
        start,
        start + 1000,
      );


    const response =
      await fetch(
        'https://exp.host/--/api/v2/push/getReceipts',
        {
          method:
            'POST',

          headers: {
            'Accept':
              'application/json',

            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              ids:
                chunk,
            }),
        },
      );


    const payload =
      await response.json()
        .catch(
          () => null,
        );


    if (
      !response.ok
      ||
      !payload
      ||
      typeof payload !==
        'object'
    ) {
      continue;
    }


    const receiptMap =
      (
        'data' in payload
        &&
        payload.data
        &&
        typeof payload.data ===
          'object'
      )
        ? payload.data as
            Record<
              string,
              JsonObject
            >
        : {};


    for (
      const event
      of rows
    ) {
      const receiptId =
        event.provider_receipt_id;

      if (
        typeof receiptId !==
          'string'
        ||
        !chunk.includes(
          receiptId,
        )
      ) {
        continue;
      }


      const receipt =
        receiptMap[
          receiptId
        ];

      if (!receipt) {
        continue;
      }


      const status =
        receipt.status;

      const details =
        (
          receipt.details
          &&
          typeof receipt.details ===
            'object'
        )
          ? receipt.details as
              JsonObject
          : null;

      const errorCode =
        details
        &&
        typeof details.error ===
          'string'
          ? details.error
          : null;


      const {
        error:
          checkedError,
      } =
        await serviceClient
          .from(
            'notification_events',
          )
          .update({
            receipt_checked_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            event.id,
          );


      if (checkedError) {
        console.error(
          'Could not mark notification receipt checked:',
          checkedError.message,
        );

        continue;
      }


      checked += 1;


      if (
        status ===
          'error'
      ) {
        await serviceClient
          .from(
            'notification_events',
          )
          .insert({
            user_id:
              event.user_id,

            scheduled_notification_id:
              event.scheduled_notification_id,

            device_id:
              event.device_id,

            event_type:
              'failed',

            provider:
              'expo',

            error_code:
              errorCode
              ?? 'expo_receipt_error',
          });


        if (
          errorCode ===
            'DeviceNotRegistered'
          &&
          event.device_id
        ) {
          await serviceClient
            .from(
              'notification_devices',
            )
            .update({
              active:
                false,

              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              'id',
              event.device_id,
            );
        }
      }
    }
  }


  return checked;
}


Deno.serve(
  async (
    request: Request,
  ) => {
    if (
      request.method ===
        'OPTIONS'
    ) {
      return new Response(
        'ok',
        {
          headers:
            corsHeaders,
        },
      );
    }


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
      const expectedSecret =
        getRequiredEnv(
          'NOTIFICATION_DISPATCH_SECRET',
        );

      const suppliedSecret =
        request.headers.get(
          'x-notification-dispatch-secret',
        );


      if (
        !suppliedSecret
        ||
        suppliedSecret !==
          expectedSecret
      ) {
        return jsonResponse(
          {
            error:
              'Unauthorized dispatcher request.',
          },
          401,
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
        error:
          refreshError,
      } =
        await serviceClient.rpc(
          'refresh_all_notification_schedules',
          {
            p_horizon_days:
              14,
          },
        );


      if (refreshError) {
        throw new Error(
          `Could not refresh notification schedules: ${refreshError.message}`,
        );
      }


      const {
        data:
          claimed,

        error:
          claimError,
      } =
        await serviceClient.rpc(
          'claim_due_notifications',
          {
            p_limit:
              50,
          },
        );


      if (claimError) {
        throw new Error(
          `Could not claim notifications: ${claimError.message}`,
        );
      }


      const notifications =
        (
          claimed
          ?? []
        ) as
          Array<
            Record<
              string,
              unknown
            >
          >;


      let sentCount =
        0;

      let deferredCount =
        0;

      let failedCount =
        0;


      for (
        const notification
        of notifications
      ) {
        const notificationId =
          notification.id;

        const userId =
          notification.user_id;


        if (
          typeof notificationId !==
            'string'
          ||
          typeof userId !==
            'string'
        ) {
          continue;
        }


        const {
          data:
            preferences,

          error:
            preferencesError,
        } =
          await serviceClient
            .from(
              'notification_preferences',
            )
            .select(
              'master_enabled, push_enabled',
            )
            .eq(
              'user_id',
              userId,
            )
            .maybeSingle();


        if (
          preferencesError
        ) {
          await serviceClient.rpc(
            'release_notification_for_retry',
            {
              p_notification_id:
                notificationId,

              p_error:
                preferencesError.message,
            },
          );

          failedCount += 1;
          continue;
        }


        if (
          !preferences
          ||
          !preferences.master_enabled
          ||
          !preferences.push_enabled
        ) {
          await serviceClient
            .from(
              'scheduled_notifications',
            )
            .update({
              status:
                'pending',

              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              'id',
              notificationId,
            );

          deferredCount += 1;
          continue;
        }


        const {
          data:
            devices,

          error:
            devicesError,
        } =
          await serviceClient
            .from(
              'notification_devices',
            )
            .select(
              'id, expo_push_token',
            )
            .eq(
              'user_id',
              userId,
            )
            .eq(
              'active',
              true,
            )
            .order(
              'last_seen_at',
              {
                ascending:
                  false,
              },
            )
            .limit(
              20,
            );


        if (devicesError) {
          await serviceClient.rpc(
            'release_notification_for_retry',
            {
              p_notification_id:
                notificationId,

              p_error:
                devicesError.message,
            },
          );

          failedCount += 1;
          continue;
        }


        if (
          !devices
          ||
          devices.length === 0
        ) {
          await serviceClient
            .from(
              'scheduled_notifications',
            )
            .update({
              status:
                'pending',

              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              'id',
              notificationId,
            );

          deferredCount += 1;
          continue;
        }


        const messages =
          devices.map(
            (device) => ({
              to:
                device.expo_push_token,

              sound:
                'default',

              channelId:
                'finance-coach-reminders',

              title:
                String(
                  notification.title
                  ?? 'Finance Coach',
                ),

              body:
                String(
                  notification.body
                  ?? '',
                ),

              data: {
                notificationId,

                deepLink:
                  typeof notification.deep_link ===
                    'string'
                    ? notification.deep_link
                    : null,
              },
            }),
          );


        let tickets:
          PushTicket[];


        try {
          tickets =
            await sendExpoBatch(
              messages,
            );
        } catch (
          error
        ) {
          await serviceClient.rpc(
            'release_notification_for_retry',
            {
              p_notification_id:
                notificationId,

              p_error:
                error instanceof Error
                  ? error.message
                  : 'Expo Push Service request failed',
            },
          );

          failedCount += 1;
          continue;
        }


        let accepted =
          0;


        for (
          let index = 0;
          index < devices.length;
          index += 1
        ) {
          const device =
            devices[index];

          const ticket =
            tickets[index];


          if (
            ticket
            &&
            ticket.status ===
              'ok'
            &&
            typeof ticket.id ===
              'string'
          ) {
            accepted += 1;


            await serviceClient
              .from(
                'notification_events',
              )
              .insert({
                user_id:
                  userId,

                scheduled_notification_id:
                  notificationId,

                device_id:
                  device.id,

                event_type:
                  'sent',

                provider:
                  'expo',

                provider_receipt_id:
                  ticket.id,
              });

            continue;
          }


          const errorCode =
            ticket
            ?.details
            ?.error
            ?? 'expo_ticket_error';


          await serviceClient
            .from(
              'notification_events',
            )
            .insert({
              user_id:
                userId,

              scheduled_notification_id:
                notificationId,

              device_id:
                device.id,

              event_type:
                'failed',

              provider:
                'expo',

              error_code:
                errorCode,
            });


          if (
            errorCode ===
              'DeviceNotRegistered'
          ) {
            await serviceClient
              .from(
                'notification_devices',
              )
              .update({
                active:
                  false,

                updated_at:
                  new Date()
                    .toISOString(),
              })
              .eq(
                'id',
                device.id,
              );
          }
        }


        if (
          accepted > 0
        ) {
          await serviceClient
            .from(
              'scheduled_notifications',
            )
            .update({
              status:
                'sent',

              sent_at:
                new Date()
                  .toISOString(),

              last_error:
                null,

              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              'id',
              notificationId,
            );


          sentCount += 1;
        } else {
          await serviceClient.rpc(
            'release_notification_for_retry',
            {
              p_notification_id:
                notificationId,

              p_error:
                'Expo rejected all active device tokens.',
            },
          );

          failedCount += 1;
        }
      }


      const receiptsChecked =
        await checkReceipts(
          serviceClient,
        );


      return jsonResponse({
        claimed:
          notifications.length,

        sent:
          sentCount,

        deferred:
          deferredCount,

        failed:
          failedCount,

        receipts_checked:
          receiptsChecked,
      });
    } catch (
      error
    ) {
      console.error(
        'Notification dispatcher failed:',
        error instanceof Error
          ? error.message
          : 'Unknown error',
      );


      return jsonResponse(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Notification dispatch failed.',
        },
        500,
      );
    }
  },
);