<?php
$pdo = require_once '../util/include.php';
$products = $pdo->query('SELECT * FROM `product`')->fetchAll();
?>

<!doctype html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Document</title>
    <?php
    include '../util/head.php';
    ?>
    <style>
        .card-img-top {
            width: 100%;
            height: 25vh;
            object-fit: contain;
        }
    </style>
</head>
<body>
<div class="container">
    <div class="row">
        <? foreach ($products as $product) { ?>
            <div class="col-3">
                <div class="card my-3">
                    <img src="<?= $product['image_url']?>" alt="Картинка товара" class="card-img-top">
                    <div class="card-body">
                        <?= $product['title']?>
                        (<?= $product['price']?> ₽)
                    </div>
                </div>
            </div>
        <? } ?>
    </div>
</div>
</body>
</html>

