<?php
$pdo = require_once '../util/include.php';
$countries = $pdo->query('SELECT * FROM `country`')->fetchAll();
?>
<!doctype html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Document</title>
    <?php
    include '../util/head.php';
    ?>
</head>
<body style="display:flex; height: 100vh; justify-content: center; align-items: center">
<form action="addProduct.php" enctype="multipart/form-data" method="post">
    <div>
        <label for="title" class="form-label">
            Название товара
        </label>
        <input id="title" type="text" name="title" class="form-control">
    </div>
    <div>
        <label for="price" class="form-label">
            Стоимость товара
        </label>
        <input id="price" type="text" name="price" class="form-control">
    </div>
    <div>
        <label for="country-id" class="form-label">
            Страна - изготовитель
        </label>
        <select id="country-id" name="country_id" class="form-select" size="7">
            <?php
            foreach ($countries as $country) { ?>
                <option value="<?= $country['id'] ?>">
                    <?= $country['name'] ?>
                </option>
            <? } ?>
        </select>
    </div>
    <div>
        <label for="description" class="form-label">
            Описание товара
        </label>
        <textarea id="description" name="description" class="form-control" rows="4" cols="30"></textarea>
    </div>
    <div>
        <label for="image" class="form-label">
            Картинка товара
        </label>
        <input id="image" type="file" name="image" class="form-control" accept="image/*">
    </div>
    <div>
        <button class="btn btn-primary mt-3 w-50">Добавить</button>
    </div>
</form>
</body>
</html>
