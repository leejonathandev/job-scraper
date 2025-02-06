/*
    sqlite3 database functionality should be established after 
    storage into RAM is done as well as functionality for other sites.
*/

import sqlite3 from 'sqlite3';

const dbName = 'listings.db';

async function getDb() {
    try {
        // Automatically connects to existing, otherwise, creates new one
        const db = new sqlite3.Database(dbName);

        // Check if the table exists. Create it if it doesn't.
        await db.exec(`
      CREATE TABLE IF NOT EXISTS myTable (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        value TEXT
        -- Add other columns as needed
      );
    `);

        return db;
    } catch (err) {
        console.error('Error opening or creating database:', err);
        throw err; // Re-throw the error for handling elsewhere
    }
}

async function createItem(name: string, value: string) {
    const db = await getDb();
    const result = await db.run('INSERT INTO myTable (name, value) VALUES (?, ?)', [name, value]);
    await db.close();
    return result; // Return the result of the insertion (e.g., lastID)
}

async function getItem(id: number) {
    const db = await getDb();
    const row = await db.get('SELECT * FROM myTable WHERE id = ?', [id]);
    await db.close();
    return row;
}

async function updateItem(id: number, name: string, value: string) {
    const db = await getDb();
    const result = await db.run('UPDATE myTable SET name = ?, value = ? WHERE id = ?', [name, value, id]);
    await db.close();
    return result;
}

async function deleteItem(id: number) {
    const db = await getDb();
    const result = await db.run('DELETE FROM myTable WHERE id = ?', [id]);
    await db.close();
    return result;
}

// Example usage
async function main() {
    try {
        await createItem("Test Name", "Test Value");
        const item = await getItem(1);
        console.log(item);
        await updateItem(1, "Updated Name", "Updated Value");
        const updatedItem = await getItem(1);
        console.log(updatedItem);
        await deleteItem(1);
        const deletedItem = await getItem(1);
        console.log(deletedItem); // should be undefined since it was deleted

    } catch (error) {
        console.error("An error occurred:", error);
    }
}

main();
