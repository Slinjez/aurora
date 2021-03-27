const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const pageViewsPerformance = async (range, seed) => {
  return await prisma.$queryRaw(`
    select
      currentPerformance.c as cp,
      lastPerformance.c as lp,
      (
        (
          (
            currentPerformance.c - lastPerformance.c
          ):: float / (CASE lastPerformance.c WHEN 0 THEN 1 ELSE lastPerformance.c END) :: float
        )* 100
      ) inc
    from
      (
        select
          count(events.id) as c
        from
          events
        JOIN websites ON events.website_id = websites.id
        where
          events.created_at >= (now() - '1 ${range}' :: interval)
          AND websites.seed = '${seed}'
      ) as currentPerformance CROSS
      JOIN (
        select
          count(events.id) as c
        from
          events
          JOIN websites ON events.website_id = websites.id
        where
          events.created_at BETWEEN (now() - '2 ${range}' :: interval)
          and (now() - '1 ${range}' :: interval)
          AND websites.seed = '${seed}'
      ) as lastPerformance
  `);
};

const uniqueVisitorsPerformance = async (range, seed) => {
  return await prisma.$queryRaw(`
    select
      currentPerformance.c as cp,
      lastPerformance.c as lp,
      (
        (
          (
            currentPerformance.c - lastPerformance.c
          ):: float / (CASE lastPerformance.c WHEN 0 THEN 1 ELSE lastPerformance.c END) :: float
        )* 100
      ) inc
    from
      (
        select
          count(DISTINCT hash) as c
        from
          events
        JOIN websites ON events.website_id = websites.id
        where
          events.created_at >= (now() - '1 ${range}' :: interval)
          AND websites.seed = '${seed}'
      ) as currentPerformance CROSS
      JOIN (
        select
          count(DISTINCT hash) as c
        from
          events
        JOIN websites ON events.website_id = websites.id
        where
          events.created_at BETWEEN (now() - '2 ${range}' :: interval)
          and (now() - '1 ${range}' :: interval)
          AND websites.seed = '${seed}'
      ) as lastPerformance
  `);
};

const bounceRatePerformance = async (range, seed) => {
  return await prisma.$queryRaw(`
    select
      currentPerformance.c as cp,
      lastPerformance.c as lp,
      (
        (
          (
            currentPerformance.c - lastPerformance.c
          ):: float / (
            CASE lastPerformance.c WHEN 0 THEN 1 ELSE lastPerformance.c END
          ) :: float
        )* 100
      ) inc
    from
      (
        select
          CASE totalViews WHEN 0 THEN 0 ELSE round(
            (
              (uniqueViews / totalViews) * 100
            ),
            2
          ) END as c
        from
          (
            select
              count(events.id) as totalViews,
              (
                select
                  sum(t.c)
                from
                  (
                    select
                      count(events.id) as c
                    from
                      events
                    group by
                      hash
                    having
                      count(events.id) = 1
                  ) as t
              ) as uniqueViews
            from
              events
            JOIN websites ON events.website_id = websites.id
            where
              events.created_at >= (now() - '1 ${range}' :: interval)
              AND websites.seed = '${seed}'
          ) as x
      ) as currentPerformance CROSS
      JOIN (
        select
          CASE totalViews WHEN 0 THEN 0 ELSE round(
            (
              (uniqueViews / totalViews) * 100
            ),
            2
          ) END as c
        from
          (
            select
              count(events.id) as totalViews,
              (
                select
                  sum(t.c)
                from
                  (
                    select
                      count(events.id) as c
                    from
                      events
                    group by
                      hash
                    having
                      count(events.id) = 1
                  ) as t
              ) as uniqueViews
            from
              events
            JOIN websites ON events.website_id = websites.id
            where
              events.created_at BETWEEN (now() - '2 ${range}' :: interval)
              and (now() - '1 ${range}' :: interval)
              AND websites.seed = '${seed}'
          ) as x
      ) as lastPerformance
  `);
};

module.exports = async (req, res) => {
  // Only GET Available
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  const { range, seed } = req.query;

  const r = range.replace("this_", ""); /// XXX TO CHECK VALUES

  const pvpp = pageViewsPerformance(r, seed)
    .catch((e) => {
      throw e;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });

  const uvpp = uniqueVisitorsPerformance(r, seed)
    .catch((e) => {
      throw e;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });

  const brpp = bounceRatePerformance(r, seed)
    .catch((e) => {
      throw e;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });

  return await Promise.all([pvpp, uvpp, brpp]).then(([pvp, uvp, brp]) =>
    res.json({
      data: {
        pageViews: pvp[0], // XXX
        uniqueVisitors: uvp[0], // XXX
        bounceRate: brp[0], // XXX
      },
    })
  );
};