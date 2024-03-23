-- phpMyAdmin SQL Dump
-- version 5.1.1deb5ubuntu1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Oct 22, 2022 at 11:37 PM
-- Server version: 8.0.30-0ubuntu0.22.04.1
-- PHP Version: 8.1.2

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO,NO_ENGINE_SUBSTITUTION";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Database: `aleta`
--
CREATE DATABASE IF NOT EXISTS `aleta` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;
USE `aleta`;

-- --------------------------------------------------------

--
-- Table structure for table `assistència`
--

CREATE TABLE `assistència` (
  `id` int NOT NULL,
  `event-id` int NOT NULL,
  `casteller-id` int NOT NULL,
  `assistència` tinyint(1) NOT NULL COMMENT 'Si ve o no',
  `data-entrada` text DEFAULT NULL,
  `data-sortida` text DEFAULT NULL,
  `transport` varchar(40) DEFAULT NULL COMMENT 'Per si ve amb autocar o per ell sol',
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

CREATE TABLE `pagaments` (
  `id` int NOT NULL,
  `casteller-id` int NOT NULL,
  `producte-id` varchar(40) NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(40) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `productes` (
  `id` varchar(40) NOT NULL,
  `nom` varchar(40) NOT NULL,
  `preu` int NOT NULL,
  `descripcio` varchar(400) DEFAULT NULL,
  `tipus` varchar(40) DEFAULT NULL,
  `event-id` int DEFAULT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Table structure for table `castellers`
--

CREATE TABLE `castellers` (
  `id` int NOT NULL,
  `nom` varchar(40) NOT NULL,
  `mote` varchar(200) DEFAULT NULL,
  `primer-cognom` varchar(40) NOT NULL,
  `segon-cognom` varchar(40) DEFAULT NULL,
  `version` varchar(40) DEFAULT NULL,
  `telegram` varchar(100) DEFAULT NULL,
  `mail` varchar(100) DEFAULT NULL,
  `gènere` tinyint DEFAULT NULL,
  `altura` int DEFAULT NULL,
  `altura_mans` int DEFAULT NULL,
  `data-naixament` date DEFAULT NULL,
  `colla-convencional` varchar(400) DEFAULT NULL,
  `anys-experiència` int DEFAULT NULL,
  `es_tecnica` tinyint(1) NOT NULL DEFAULT '0',
  `es_junta` tinyint(1) NOT NULL DEFAULT '0',
  `chat_id` varchar(40) DEFAULT NULL,
  `md5pass` varchar(255) DEFAULT NULL,
  `expo_push_token` varchar(255) DEFAULT NULL,
  `hidden` tinyint(1) NOT NULL DEFAULT 0,
  `canalla` tinyint(1) NOT NULL DEFAULT 0,
  `lesionat` tinyint(1) NOT NULL DEFAULT 0,
  `music` tinyint(1) NOT NULL DEFAULT 0,
  `extern` tinyint(1) NOT NULL DEFAULT 0,
  `novell` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `events`
--

CREATE TABLE `events` (
  `id` int NOT NULL,
  `tipus` varchar(20) NOT NULL,
  `lloc` varchar(400) NOT NULL,
  `title` varchar(400) DEFAULT NULL,
  `description` longtext DEFAULT NULL,
  `data-esperada-inici` datetime NOT NULL,
  `data-esperada-fi` datetime NOT NULL,
  `data-real-inici` datetime DEFAULT NULL,
  `data-real-fi` datetime DEFAULT NULL,
  `gcalendar-link` varchar(400) NOT NULL,
  `hash` varchar(128) NOT NULL UNIQUE,
  `targets` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `resultats`
--

CREATE TABLE `resultats` (
  `event` INT NOT NULL,
  `castell` varchar(200) NOT NULL,
  `versio` varchar(200) NOT NULL,
  `objectiu` varchar(200) NOT NULL,
  `resultat` varchar(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Table structure for table `feedback`
--

CREATE TABLE `feedback` (
  `prova-id` int NOT NULL,
  `casteller-id` int NOT NULL,
  `veredicte` varchar(20) DEFAULT NULL,
  `comentari` varchar(2000) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `posicions`
--

CREATE TABLE `posicions` (
  `prova-id` int NOT NULL,
  `posició-num` int NOT NULL,
  `casteller-id` int NOT NULL,
  `pis` int DEFAULT NULL,
  `cordó` int DEFAULT NULL,
  `tipus` varchar(40) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `proves`
--

CREATE TABLE `proves` (
  `id` int NOT NULL,
  `event` int DEFAULT NULL,
  `data-esperada-inici` datetime NOT NULL,
  `data-esperada-fi` datetime NOT NULL,
  `data-real-inici` datetime DEFAULT NULL,
  `data-real-fi` datetime DEFAULT NULL,
  `tipus` varchar(20) NOT NULL,
  `resultat` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `casteller_etiqueta`
--

CREATE TABLE `casteller_etiqueta` (
  `casteller-id` int NOT NULL,
  `etiqueta-id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `etiquetes`
--

CREATE TABLE `etiquetes` (
  `id` int NOT NULL,
  `nom` varchar(40) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `anuncis`
--

CREATE TABLE `anuncis` (
  `id` int NOT NULL,
  `text` varchar(8000) DEFAULT NULL,
  `date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Table structure for table `messages`
--

CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  castell VARCHAR(255),
  event VARCHAR(255),
  versio VARCHAR(255),
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `notifications`
--

CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    target_token VARCHAR(255) DEFAULT NULL,
    notification_id VARCHAR(255) DEFAULT NULL,
    data TEXT DEFAULT NULL,
    target INT DEFAULT NULL,
    title TEXT DEFAULT NULL,
    body TEXT DEFAULT NULL,
    author INT DEFAULT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

ALTER TABLE castellers
  ADD UNIQUE INDEX idx_unique (nom, `primer-cognom`, `segon-cognom`);

--
-- Indexes for table `assistència`
--
ALTER TABLE `assistència`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `pagaments`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `productes`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `castellers`
--
ALTER TABLE `castellers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `feedback`
--
ALTER TABLE `feedback`
  ADD PRIMARY KEY (`prova-id`,`casteller-id`);

--
-- Indexes for table `posicions`
--
ALTER TABLE `posicions`
  ADD PRIMARY KEY (`prova-id`,`posició-num`);

--
-- Indexes for table `resultats`
--
ALTER TABLE `resultats`
  ADD PRIMARY KEY (`event`,`castell`,`versio`);

--
-- Indexes for table `proves`
--
ALTER TABLE `proves`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `proves`
--
ALTER TABLE `anuncis`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `casteller_etiqueta`
  ADD PRIMARY KEY (`casteller-id`,`etiqueta-id`);

ALTER TABLE `etiquetes`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

ALTER TABLE `etiquetes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `castellers`
--
ALTER TABLE `assistència`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `assistència`
  MODIFY `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE `pagaments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `castellers`
--
ALTER TABLE `castellers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `events`
--
ALTER TABLE `events`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `proves`
--
ALTER TABLE `proves`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `anuncis`
--
ALTER TABLE `anuncis`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- INDEXING for table `assistència`
--
ALTER TABLE assistència ADD INDEX idx_casteller_id (`casteller-id`);
ALTER TABLE assistència ADD INDEX idx_event_id (`event-id`);

--
-- INDEXING for table `pagaments`
--
ALTER TABLE pagaments ADD INDEX idx_producte_id (`producte-id`);
ALTER TABLE pagaments ADD INDEX idx_casteller_id_id (`casteller-id`, `id`);

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
