package ch.lonelyporter.statsapp.persistence;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;

final class AtomicFileWriter {
    private AtomicFileWriter() {
    }

    static void replace(Path target, byte[] contents) throws IOException {
        Path temporaryFile = writeTemporaryFile(target, contents);
        try {
            Files.move(temporaryFile, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException | RuntimeException exception) {
            deleteTemporaryFile(temporaryFile, exception);
            throw exception;
        }
    }

    static void createNew(Path target, byte[] contents) throws IOException {
        Path temporaryFile = writeTemporaryFile(target, contents);
        try {
            Files.move(temporaryFile, target);
        } catch (IOException | RuntimeException exception) {
            deleteTemporaryFile(temporaryFile, exception);
            throw exception;
        }
    }

    private static Path writeTemporaryFile(Path target, byte[] contents) throws IOException {
        Path parent = target.getParent();
        Path temporaryFile = Files.createTempFile(parent, target.getFileName() + ".", ".tmp");
        try {
            Files.write(temporaryFile, contents, StandardOpenOption.WRITE, StandardOpenOption.TRUNCATE_EXISTING);
            return temporaryFile;
        } catch (IOException | RuntimeException exception) {
            deleteTemporaryFile(temporaryFile, exception);
            throw exception;
        }
    }

    private static void deleteTemporaryFile(Path temporaryFile, Throwable exception) {
        try {
            Files.deleteIfExists(temporaryFile);
        } catch (IOException cleanupException) {
            exception.addSuppressed(cleanupException);
        }
    }
}
