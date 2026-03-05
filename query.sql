SELECT id, description, amount, nature, isPaid, date FROM transactions 
WHERE description LIKE '%Studio%' OR description LIKE '%Enel%' 
ORDER BY date DESC LIMIT 5;
