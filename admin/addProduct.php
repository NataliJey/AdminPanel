<?php
$pdo = require_once '../util/include.php';

$title = $_POST['title'];
$price = $_POST['price'];
$countryId = $_POST['country_id'];
$description = $_POST['description'];
var_dump($_POST);
$pdo->query("INSERT INTO `product` (title, price,country_id,description,image_url) values ('$title', $price,$countryId,'$description','')");

$productId = $pdo->lastInsertId ();
$imageUrl ="files/products/$productId.png";
move_uploaded_file($_FILES['image']['tmp_name'], "../$imageUrl");

$pdo->query("UPDATE `product` SET image_url='/$imageUrl' WHERE id='$productId'");

//header("Location:productListAdmin.php");