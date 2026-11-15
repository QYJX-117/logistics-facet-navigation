require('dotenv').config();
const mysql = require('mysql2/promise');

// 数据库连接配置（通过环境变量注入，不要把密码写入仓库）
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'logistics_db'
};

let pool;

// 初始化数据库连接池
async function initializeDatabase() {
    try {
        // 首先连接到 MySQL 服务器，但不指定数据库
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password
        });
        
        // 创建数据库（如果不存在）
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
        await connection.end();

        // 创建连接池，连接到指定数据库
        pool = mysql.createPool(dbConfig);
        
        // 测试连接
        const [rows] = await pool.query('SELECT 1');
        console.log('Connected to the MySQL database.');

    } catch (error) {
        console.error('Error connecting to MySQL database:', error);
        process.exit(1); // 如果无法连接数据库，则退出应用
    }
}

initializeDatabase();


/**
 * 获取所有分面及其取值
 */
const getFacets = async () => {
  const sql = `
    SELECT
      f.id as facet_id,
      f.name as facet_name,
      f.code as facet_code,
      JSON_ARRAYAGG(
        JSON_OBJECT('id', fv.id, 'value', fv.value)
      ) as \`values\`
    FROM facets f
    JOIN facet_values fv ON f.id = fv.facet_id
    GROUP BY f.id
    ORDER BY f.id;
  `;
  const [rows] = await pool.query(sql);
  return rows;
};

/**
 * 根据选择的分面值筛选服务
 * @param {Object} filters - 筛选条件，键是 facet_code，值是 facet_value_id 数组
 */
const getServices = async (filters = {}) => {
    let sql = `
      SELECT
        s.id,
        s.name,
        s.description
      FROM services s
    `;
    const whereClauses = [];
    const params = [];

    Object.entries(filters).forEach(([facetCode, valueIds]) => {
      if (Array.isArray(valueIds) && valueIds.length > 0) {
        const placeholders = valueIds.map(() => '?').join(',');
        whereClauses.push(`
          s.id IN (
            SELECT sfv.service_id
            FROM service_facet_values sfv
            JOIN facet_values fv ON sfv.facet_value_id = fv.id
            JOIN facets f ON fv.facet_id = f.id
            WHERE f.code = ? AND fv.id IN (${placeholders})
          )
        `);
        params.push(facetCode, ...valueIds);
      }
    });

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ' ORDER BY s.id;';

    const [rows] = await pool.query(sql, params);
    return rows;
};

module.exports = {
  getFacets,
  getServices,
};