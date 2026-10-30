package ch.lonelyporter.statsapp.persistence;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.charset.StandardCharsets;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AtomicFileWriterTest {
    @TempDir
    Path tempDir;

    @Test
    void replaceReplacesExistingFileContents() throws Exception {
        Path target = tempDir.resolve("data.json");
        Files.writeString(target, "old contents");

        AtomicFileWriter.replace(target, "new contents".getBytes(StandardCharsets.UTF_8));

        assertThat(Files.readString(target)).isEqualTo("new contents");
        try (var files = Files.list(tempDir)) {
            assertThat(files.map(Path::getFileName).map(Path::toString))
                    .containsExactly("data.json");
        }
    }

    @Test
    void createNewDoesNotOverwriteExistingFile() throws Exception {
        Path target = tempDir.resolve("data.json");
        Files.writeString(target, "existing contents");

        assertThatThrownBy(() -> AtomicFileWriter.createNew(target, "replacement".getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(FileAlreadyExistsException.class);

        assertThat(Files.readString(target)).isEqualTo("existing contents");
        try (var files = Files.list(tempDir)) {
            assertThat(files.map(Path::getFileName).map(Path::toString))
                    .containsExactly("data.json");
        }
    }
}
