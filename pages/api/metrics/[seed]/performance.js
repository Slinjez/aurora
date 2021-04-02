const { PrismaClient } = require("@prisma/client");

const withAuth = require("../../../../utils/with-auth");
const percentage = require("../../../../utils/percentage");

const prisma = new PrismaClient();

// const pageViewsPerformance = async (range, seed) => {
//   return await prisma.$queryRaw(`
//     SELECT
//       *
//     from
//       (
//         SELECT
//           COUNT(events.created_at) as cp_views,
//           COUNT(DISTINCT events.hash) as cp_unique
//         FROM
//           events
//           JOIN websites ON events.website_id = websites.id
//         WHERE
//           events.created_at >= DATE_TRUNC('${range}', now())
//           AND websites.seed = '${seed}'
//       ) as cp CROSS
//       JOIN (
//         SELECT
//           COUNT(events.created_at) as lp_views,
//           COUNT(DISTINCT events.hash) as lp_unique
//         FROM
//           events
//           JOIN websites ON events.website_id = websites.id
//         WHERE
//           events.created_at BETWEEN (
//             DATE_TRUNC('${range}', now()) - '1 ${range}' :: interval
//           )
//           and DATE_TRUNC('${range}', now())
//           AND websites.seed = '${seed}'
//       ) as lp
//   `);
// };

const performance = async (range, seed) => {
  return await prisma.$queryRaw(`
    SELECT
      *
    from
      (
        SELECT
          COUNT(events.created_at) as cp_views,
          COUNT(DISTINCT events.hash) as cp_unique,
          (
            select
              sum(t.c)
            from
              (
                select
                  count(events.id) as c
                from
                  events
                JOIN websites ON events.website_id = websites.id
                WHERE
                  events.created_at >= DATE_TRUNC('${range}', now())
                  AND websites.seed = '${seed}'
                group by
                  hash
                having
                  count(events.id) = 1
              ) as t
          ) as cp_bounces
        FROM
          events
          JOIN websites ON events.website_id = websites.id
        WHERE
          events.created_at >= DATE_TRUNC('${range}', now())
          AND websites.seed = '${seed}'
      ) as cp CROSS
      JOIN (
        SELECT
          COUNT(events.created_at) as lp_views,
          COUNT(DISTINCT events.hash) as lp_unique,
          (
            select
              sum(t.c)
            from
              (
                select
                  count(events.id) as c
                from
                  events
                JOIN websites ON events.website_id = websites.id
                WHERE
                  events.created_at BETWEEN (
                    DATE_TRUNC('${range}', now()) - '1 ${range}' :: interval
                  )
                  and DATE_TRUNC('${range}', now())
                  AND websites.seed = '${seed}'
                group by
                  hash
                having
                  count(events.id) = 1
              ) as t
          ) as lp_bounces
        FROM
          events
          JOIN websites ON events.website_id = websites.id
        WHERE
          events.created_at BETWEEN (
            DATE_TRUNC('${range}', now()) - '1 ${range}' :: interval
          )
          and DATE_TRUNC('${range}', now())
          AND websites.seed = '${seed}'
      ) as lp
  `);
};

const handleGet = async (req, res) => {
  const { range, seed } = req.query;

  const rows = await performance(range, seed)
    .catch((e) => {
      throw e;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });

  const perf = await rows.reduce((acc, el) => el, {});

  const data = {
    pageViews: {
      cp: perf.cp_views,
      lp: perf.lp_views,
      inc: perf.cp_views - perf.lp_views,
    },
    uniqueVisitors: {
      cp: perf.cp_unique,
      lp: perf.lp_unique,
      inc: perf.cp_unique - perf.lp_unique,
    },
    bounceRate: {
      cp: perf.cp_bounces,
      lp: perf.lp_bounces,
      inc: perf.cp_bounces - perf.lp_bounces,
    },
  };

  //   const perc = percentage(el.views, totalViews);

  return { status: 200, data: data };
};

const handle = async function (req, res) {
  let { status, data } = {};

  switch (req.method) {
    case "GET":
      ({ status, data } = await handleGet(req, res));
      break;
    default:
      return res.status(405).json({ message: "Method not allowed." });
  }

  return res.status(status).json({ data: data });
};

module.exports = withAuth(handle);
